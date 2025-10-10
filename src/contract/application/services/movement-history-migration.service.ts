import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { Movement } from '../../../core/infrastructure/mongo/schemas/public/movement.schema';

export interface MigrationResult {
  totalMovements: number;
  totalHistoryEntries: number;
  linkedPairs: number;
  errors: string[];
  details: Array<{
    movementId: string;
    historyId: string;
    matchType: 'exact' | 'fuzzy' | 'failed';
    reason?: string;
  }>;
}

export interface MigrationStats {
  totalMovements: number;
  totalHistoryEntries: number;
  movementsWithLinks: number;
  movementsWithoutLinks: number;
  historyWithLinks: number;
  historyWithoutLinks: number;
}

@Injectable()
export class MovementHistoryMigrationService {
  constructor(
    @InjectModel(Movement.name)
    private readonly movementModel: Model<Movement>,
    @InjectModel(ContractHistory.name)
    private readonly contractHistoryModel: Model<ContractHistory>,
  ) {}

  /**
   * Migra y enlaza movimientos existentes con entradas del histórico de contratos
   */
  async linkExistingMovementsWithHistory(): Promise<MigrationResult> {
    const result: MigrationResult = {
      totalMovements: 0,
      totalHistoryEntries: 0,
      linkedPairs: 0,
      errors: [],
      details: [],
    };

    try {
      // 1. Obtener todos los movimientos sin enlace al histórico
      const movements = await this.movementModel.find({
        contractHistoryEntry: { $exists: false }
      }).sort({ createdAt: 1 });

      // 2. Obtener todas las entradas del histórico con metadatos monetarios sin enlace a movimientos
      const historyEntries = await this.contractHistoryModel.find({
        relatedMovement: { $exists: false },
        'eventMetadata.amount': { $exists: true },
        isDeleted: { $ne: true }
      }).sort({ createdAt: 1 });

      result.totalMovements = movements.length;
      result.totalHistoryEntries = historyEntries.length;

      console.log(`[Migration] Encontrados ${movements.length} movimientos sin enlace`);
      console.log(`[Migration] Encontradas ${historyEntries.length} entradas de histórico con metadatos monetarios`);

      // 3. Crear mapas para búsqueda eficiente
      const historyByMetadata = new Map<string, any[]>();
      
      for (const historyEntry of historyEntries) {
        const metadata = historyEntry.eventMetadata;
        if (metadata && metadata.amount) {
          // Crear claves de búsqueda múltiples para mayor flexibilidad
          const keys = this.generateSearchKeys(metadata);
          
          for (const key of keys) {
            if (!historyByMetadata.has(key)) {
              historyByMetadata.set(key, []);
            }
            historyByMetadata.get(key)!.push({
              historyEntry,
              metadata,
              originalKey: key
            });
          }
        }
      }

      console.log(`[Migration] Creado mapa de búsqueda con ${historyByMetadata.size} claves`);

      // 4. Procesar cada movimiento
      for (const movement of movements) {
        try {
          const matchResult = await this.findMatchingHistoryEntry(
            movement,
            historyByMetadata
          );

          if (matchResult.historyEntry && matchResult.matchType !== 'failed') {
            // Enlazar bidireccional
            await this.linkMovementAndHistory(
              movement,
              matchResult.historyEntry,
              matchResult.matchType
            );

            result.linkedPairs++;
            result.details.push({
              movementId: movement._id.toString(),
              historyId: matchResult.historyEntry._id.toString(),
              matchType: matchResult.matchType,
              reason: matchResult.reason
            });

            console.log(`[Migration] Enlazado: Movimiento ${movement._id} ↔ Histórico ${matchResult.historyEntry._id} (${matchResult.matchType})`);
          } else {
            result.details.push({
              movementId: movement._id.toString(),
              historyId: '',
              matchType: 'failed',
              reason: matchResult.reason || 'No se encontró coincidencia'
            });
          }
        } catch (error) {
          const errorMsg = `Error procesando movimiento ${movement._id}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`[Migration] ${errorMsg}`);
        }
      }

      console.log(`[Migration] Migración completada: ${result.linkedPairs} enlaces creados de ${result.totalMovements} movimientos`);
      
      return result;
    } catch (error) {
      result.errors.push(`Error general en migración: ${error.message}`);
      return result;
    }
  }

  /**
   * Genera claves de búsqueda múltiples para mayor flexibilidad en el matching
   */
  private generateSearchKeys(metadata: any): string[] {
    const keys: string[] = [];
    const amount = metadata.amount;
    const date = metadata.date ? new Date(metadata.date) : null;
    const vehicle = metadata.vehicle;
    const beneficiary = metadata.beneficiary;

    // Clave exacta (más específica)
    if (amount && date && vehicle && beneficiary) {
      keys.push(`exact:${amount}:${date.toISOString()}:${vehicle}:${beneficiary}`);
    }

    // Clave por monto y fecha (sin vehículo/beneficiario)
    if (amount && date) {
      keys.push(`amount-date:${amount}:${date.toISOString()}`);
    }

    // Clave por monto y vehículo
    if (amount && vehicle) {
      keys.push(`amount-vehicle:${amount}:${vehicle}`);
    }

    // Clave por monto y beneficiario
    if (amount && beneficiary) {
      keys.push(`amount-beneficiary:${amount}:${beneficiary}`);
    }

    // Clave solo por monto (menos específica)
    if (amount) {
      keys.push(`amount-only:${amount}`);
    }

    return keys;
  }

  /**
   * Busca la entrada del histórico que mejor coincida con un movimiento
   */
  private async findMatchingHistoryEntry(
    movement: any,
    historyByMetadata: Map<string, any[]>
  ): Promise<{ historyEntry: any | null; matchType: 'exact' | 'fuzzy' | 'failed'; reason?: string }> {
    
    const movementDate = new Date(movement.date);
    const amount = movement.amount;
    const vehicle = movement.vehicle?.toString();
    const beneficiary = movement.beneficiary?.toString();

    // 1. Búsqueda exacta
    if (amount && vehicle && beneficiary) {
      const exactKey = `exact:${amount}:${movementDate.toISOString()}:${vehicle}:${beneficiary}`;
      const exactMatches = historyByMetadata.get(exactKey);
      
      if (exactMatches && exactMatches.length > 0) {
        return {
          historyEntry: exactMatches[0].historyEntry,
          matchType: 'exact',
          reason: 'Coincidencia exacta por monto, fecha, vehículo y beneficiario'
        };
      }
    }

    // 2. Búsqueda por monto y fecha con tolerancia
    const toleranceKeys = [
      `amount-date:${amount}:${movementDate.toISOString()}`,
      `amount-vehicle:${amount}:${vehicle}`,
      `amount-beneficiary:${amount}:${beneficiary}`
    ];

    for (const key of toleranceKeys) {
      const matches = historyByMetadata.get(key);
      if (matches && matches.length > 0) {
        // Buscar el que tenga la fecha más cercana
        const bestMatch = this.findClosestDateMatch(movementDate, matches);
        if (bestMatch) {
          return {
            historyEntry: bestMatch.historyEntry,
            matchType: 'fuzzy',
            reason: `Coincidencia por ${key.split(':')[0]} con tolerancia de fecha`
          };
        }
      }
    }

    // 3. Búsqueda solo por monto (menos confiable)
    const amountOnlyKey = `amount-only:${amount}`;
    const amountMatches = historyByMetadata.get(amountOnlyKey);
    
    if (amountMatches && amountMatches.length > 0) {
      const bestMatch = this.findClosestDateMatch(movementDate, amountMatches);
      if (bestMatch) {
        const timeDiff = Math.abs(movementDate.getTime() - new Date(bestMatch.metadata.date).getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // Solo aceptar si la diferencia es menor a 24 horas
        if (hoursDiff <= 24) {
          return {
            historyEntry: bestMatch.historyEntry,
            matchType: 'fuzzy',
            reason: `Coincidencia solo por monto (${hoursDiff.toFixed(1)}h de diferencia)`
          };
        }
      }
    }

    return {
      historyEntry: null,
      matchType: 'failed',
      reason: 'No se encontró coincidencia confiable'
    };
  }

  /**
   * Encuentra la coincidencia con fecha más cercana
   */
  private findClosestDateMatch(targetDate: Date, matches: any[]): any | null {
    let bestMatch = null;
    let smallestDiff = Infinity;

    for (const match of matches) {
      if (match.metadata.date) {
        const historyDate = new Date(match.metadata.date);
        const diff = Math.abs(targetDate.getTime() - historyDate.getTime());
        
        // Tolerancia de 1 hora para búsquedas fuzzy
        if (diff <= 3600000 && diff < smallestDiff) { // 1 hour = 3600000ms
          smallestDiff = diff;
          bestMatch = match;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Enlaza un movimiento con una entrada del histórico
   */
  private async linkMovementAndHistory(
    movement: any,
    historyEntry: any,
    matchType: 'exact' | 'fuzzy'
  ): Promise<void> {
    // Actualizar movimiento con referencia al histórico
    await this.movementModel.findByIdAndUpdate(
      movement._id,
      { contractHistoryEntry: historyEntry._id }
    );

    // Actualizar histórico con referencia al movimiento
    await this.contractHistoryModel.findByIdAndUpdate(
      historyEntry._id,
      { relatedMovement: movement._id }
    );
  }

  /**
   * Obtiene estadísticas de enlaces actuales
   */
  async getMigrationStats(): Promise<MigrationStats> {
    const [
      totalMovements,
      totalHistoryEntries,
      movementsWithLinks,
      historyWithLinks
    ] = await Promise.all([
      this.movementModel.countDocuments({}),
      this.contractHistoryModel.countDocuments({ 
        'eventMetadata.amount': { $exists: true },
        isDeleted: { $ne: true }
      }),
      this.movementModel.countDocuments({ 
        contractHistoryEntry: { $exists: true } 
      }),
      this.contractHistoryModel.countDocuments({ 
        relatedMovement: { $exists: true },
        isDeleted: { $ne: true }
      })
    ]);

    return {
      totalMovements,
      totalHistoryEntries,
      movementsWithLinks,
      movementsWithoutLinks: totalMovements - movementsWithLinks,
      historyWithLinks,
      historyWithoutLinks: totalHistoryEntries - historyWithLinks
    };
  }

  /**
   * Deshace todos los enlaces creados (para testing o rollback)
   */
  async unlinkAllMovementsAndHistory(): Promise<{ unlinkedMovements: number; unlinkedHistory: number }> {
    const [movementResult, historyResult] = await Promise.all([
      this.movementModel.updateMany(
        { contractHistoryEntry: { $exists: true } },
        { $unset: { contractHistoryEntry: 1 } }
      ),
      this.contractHistoryModel.updateMany(
        { relatedMovement: { $exists: true } },
        { $unset: { relatedMovement: 1 } }
      )
    ]);

    return {
      unlinkedMovements: movementResult.modifiedCount,
      unlinkedHistory: historyResult.modifiedCount
    };
  }

  /**
   * Valida la integridad de los enlaces existentes
   */
  async validateLinks(): Promise<{
    validLinks: number;
    brokenMovementLinks: number;
    brokenHistoryLinks: number;
    orphanedMovements: string[];
    orphanedHistory: string[];
  }> {
    const result = {
      validLinks: 0,
      brokenMovementLinks: 0,
      brokenHistoryLinks: 0,
      orphanedMovements: [] as string[],
      orphanedHistory: [] as string[]
    };

    // Validar enlaces desde movimientos
    const movementsWithLinks = await this.movementModel.find({
      contractHistoryEntry: { $exists: true }
    });

    for (const movement of movementsWithLinks) {
      const historyExists = await this.contractHistoryModel.findById(
        movement.contractHistoryEntry
      );
      
      if (!historyExists) {
        result.brokenMovementLinks++;
        result.orphanedMovements.push(movement._id.toString());
      } else if (historyExists.relatedMovement?.toString() === movement._id.toString()) {
        result.validLinks++;
      }
    }

    // Validar enlaces desde histórico
    const historyWithLinks = await this.contractHistoryModel.find({
      relatedMovement: { $exists: true },
      isDeleted: { $ne: true }
    });

    for (const history of historyWithLinks) {
      const movementExists = await this.movementModel.findById(
        history.relatedMovement
      );
      
      if (!movementExists) {
        result.brokenHistoryLinks++;
        result.orphanedHistory.push(history._id.toString());
      }
    }

    return result;
  }
}