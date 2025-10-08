import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { Movement } from '../../../core/infrastructure/mongo/schemas/public/movement.schema';

export interface EnhancedMigrationResult {
  totalMovements: number;
  totalHistoryEntries: number;
  linkedPairs: number;
  manualReviewNeeded: number;
  errors: string[];
  details: Array<{
    movementId: string;
    historyId: string;
    matchType: 'exact' | 'fuzzy' | 'manual' | 'failed';
    confidence: number; // 0-100
    reason: string;
    movementData?: any;
    historyData?: any;
  }>;
  manualCandidates: Array<{
    movementId: string;
    movement: any;
    possibleMatches: Array<{
      historyId: string;
      history: any;
      confidence: number;
      reasons: string[];
    }>;
  }>;
}

export interface MigrationOptions {
  // Tolerancias de tiempo
  exactTimeTolerance: number; // minutos
  fuzzyTimeTolerance: number; // horas
  maxTimeTolerance: number; // días
  
  // Umbrales de confianza
  minConfidenceForAutoLink: number; // 0-100
  minConfidenceForManualReview: number; // 0-100
  
  // Opciones de matching
  allowAmountOnlyMatching: boolean;
  allowDateRangeMatching: boolean;
  allowPartialMatching: boolean;
  
  // Modo de operación
  dryRun: boolean; // Solo analizar, no crear enlaces
}

@Injectable()
export class EnhancedMigrationService {
  constructor(
    @InjectModel(Movement.name)
    private readonly movementModel: Model<Movement>,
    @InjectModel(ContractHistory.name)
    private readonly contractHistoryModel: Model<ContractHistory>,
  ) {}

  /**
   * Migración mejorada con análisis de confianza y opciones flexibles
   */
  async enhancedLinkMovementsWithHistory(options: Partial<MigrationOptions> = {}): Promise<EnhancedMigrationResult> {
    const defaultOptions: MigrationOptions = {
      exactTimeTolerance: 5, // 5 minutos
      fuzzyTimeTolerance: 2, // 2 horas
      maxTimeTolerance: 7, // 7 días
      minConfidenceForAutoLink: 80,
      minConfidenceForManualReview: 40,
      allowAmountOnlyMatching: true,
      allowDateRangeMatching: true,
      allowPartialMatching: true,
      dryRun: false,
    };

    const config = { ...defaultOptions, ...options };

    const result: EnhancedMigrationResult = {
      totalMovements: 0,
      totalHistoryEntries: 0,
      linkedPairs: 0,
      manualReviewNeeded: 0,
      errors: [],
      details: [],
      manualCandidates: [],
    };

    try {
      // 1. Obtener datos
      const movements = await this.movementModel.find({
        contractHistoryEntry: { $exists: false }
      }).sort({ createdAt: 1 });

      const historyEntries = await this.contractHistoryModel.find({
        relatedMovement: { $exists: false },
        $or: [
          { 'eventMetadata.amount': { $exists: true } },
          { 'eventMetadata': { $exists: true } }
        ],
        isDeleted: { $ne: true }
      }).sort({ createdAt: 1 });

      result.totalMovements = movements.length;
      result.totalHistoryEntries = historyEntries.length;

      console.log(`[Enhanced Migration] Analizando ${movements.length} movimientos y ${historyEntries.length} entradas de histórico`);

      // 2. Análisis exhaustivo para cada movimiento
      for (const movement of movements) {
        try {
          const analysisResult = await this.analyzeMovementMatches(movement, historyEntries, config);
          
          if (analysisResult.bestMatch && analysisResult.bestMatch.confidence >= config.minConfidenceForAutoLink) {
            // Auto-enlazar con alta confianza
            if (!config.dryRun) {
              await this.linkMovementAndHistory(movement, analysisResult.bestMatch.historyEntry);
            }
            
            result.linkedPairs++;
            result.details.push({
              movementId: movement._id.toString(),
              historyId: analysisResult.bestMatch.historyEntry._id.toString(),
              matchType: analysisResult.bestMatch.confidence >= 90 ? 'exact' : 'fuzzy',
              confidence: analysisResult.bestMatch.confidence,
              reason: analysisResult.bestMatch.reason,
              movementData: this.sanitizeMovementData(movement),
              historyData: this.sanitizeHistoryData(analysisResult.bestMatch.historyEntry)
            });

          } else if (analysisResult.candidates.length > 0 && 
                     analysisResult.candidates[0].confidence >= config.minConfidenceForManualReview) {
            // Requiere revisión manual
            result.manualReviewNeeded++;
            result.manualCandidates.push({
              movementId: movement._id.toString(),
              movement: this.sanitizeMovementData(movement),
              possibleMatches: analysisResult.candidates.map(candidate => ({
                historyId: candidate.historyEntry._id.toString(),
                history: this.sanitizeHistoryData(candidate.historyEntry),
                confidence: candidate.confidence,
                reasons: candidate.reasons
              }))
            });

          } else {
            // Sin coincidencias confiables
            result.details.push({
              movementId: movement._id.toString(),
              historyId: '',
              matchType: 'failed',
              confidence: analysisResult.bestMatch?.confidence || 0,
              reason: 'Sin coincidencias confiables encontradas',
              movementData: this.sanitizeMovementData(movement)
            });
          }

        } catch (error) {
          const errorMsg = `Error analizando movimiento ${movement._id}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`[Enhanced Migration] ${errorMsg}`);
        }
      }

      console.log(`[Enhanced Migration] Completado: ${result.linkedPairs} enlaces automáticos, ${result.manualReviewNeeded} requieren revisión manual`);
      
      return result;
    } catch (error) {
      result.errors.push(`Error general en migración mejorada: ${error.message}`);
      return result;
    }
  }

  /**
   * Analiza todas las posibles coincidencias para un movimiento
   */
  private async analyzeMovementMatches(
    movement: any,
    historyEntries: any[],
    config: MigrationOptions
  ): Promise<{
    bestMatch: { historyEntry: any; confidence: number; reason: string; reasons: string[] } | null;
    candidates: Array<{ historyEntry: any; confidence: number; reason: string; reasons: string[] }>;
  }> {
    const candidates: Array<{ historyEntry: any; confidence: number; reason: string; reasons: string[] }> = [];

    for (const historyEntry of historyEntries) {
      const analysis = this.calculateMatchConfidence(movement, historyEntry, config);
      
      if (analysis.confidence > 0) {
        candidates.push({
          historyEntry,
          confidence: analysis.confidence,
          reason: analysis.primaryReason,
          reasons: analysis.allReasons
        });
      }
    }

    // Ordenar por confianza descendente
    candidates.sort((a, b) => b.confidence - a.confidence);

    return {
      bestMatch: candidates.length > 0 ? candidates[0] : null,
      candidates: candidates.slice(0, 5) // Top 5 candidatos
    };
  }

  /**
   * Calcula el nivel de confianza de una coincidencia
   */
  private calculateMatchConfidence(movement: any, historyEntry: any, config: MigrationOptions): {
    confidence: number;
    primaryReason: string;
    allReasons: string[];
  } {
    let confidence = 0;
    const reasons: string[] = [];
    const metadata = historyEntry.eventMetadata || {};

    // 1. Coincidencia de monto (peso: 40 puntos)
    if (metadata.amount && movement.amount) {
      if (metadata.amount === movement.amount) {
        confidence += 40;
        reasons.push(`Monto exacto: ${movement.amount}`);
      } else {
        const diff = Math.abs(metadata.amount - movement.amount);
        const percentage = (diff / movement.amount) * 100;
        if (percentage <= 5) { // 5% de tolerancia
          confidence += 30;
          reasons.push(`Monto similar: ${metadata.amount} vs ${movement.amount} (${percentage.toFixed(1)}% diff)`);
        } else if (percentage <= 15) {
          confidence += 15;
          reasons.push(`Monto aproximado: ${metadata.amount} vs ${movement.amount} (${percentage.toFixed(1)}% diff)`);
        }
      }
    }

    // 2. Coincidencia de fecha (peso: 30 puntos)
    if (metadata.date && movement.date) {
      const historyDate = new Date(metadata.date);
      const movementDate = new Date(movement.date);
      const timeDiff = Math.abs(historyDate.getTime() - movementDate.getTime());
      const minutesDiff = timeDiff / (1000 * 60);
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (minutesDiff <= config.exactTimeTolerance) {
        confidence += 30;
        reasons.push(`Fecha exacta: diferencia de ${minutesDiff.toFixed(1)} minutos`);
      } else if (hoursDiff <= config.fuzzyTimeTolerance) {
        confidence += 20;
        reasons.push(`Fecha cercana: diferencia de ${hoursDiff.toFixed(1)} horas`);
      } else if (daysDiff <= config.maxTimeTolerance) {
        confidence += 10;
        reasons.push(`Fecha en rango: diferencia de ${daysDiff.toFixed(1)} días`);
      }
    }

    // 3. Coincidencia de vehículo (peso: 15 puntos)
    if (metadata.vehicle && movement.vehicle) {
      if (metadata.vehicle.toString() === movement.vehicle.toString()) {
        confidence += 15;
        reasons.push(`Vehículo exacto: ${movement.vehicle}`);
      }
    }

    // 4. Coincidencia de beneficiario (peso: 15 puntos)
    if (metadata.beneficiary && movement.beneficiary) {
      if (metadata.beneficiary.toString() === movement.beneficiary.toString()) {
        confidence += 15;
        reasons.push(`Beneficiario exacto: ${movement.beneficiary}`);
      }
    }

    // 5. Bonificaciones por contexto
    // Mismo día de creación
    const movementCreated = new Date(movement.createdAt);
    const historyCreated = new Date(historyEntry.createdAt);
    const creationDiff = Math.abs(movementCreated.getTime() - historyCreated.getTime()) / (1000 * 60 * 60 * 24);
    
    if (creationDiff <= 1) {
      confidence += 5;
      reasons.push(`Creados el mismo día`);
    } else if (creationDiff <= 7) {
      confidence += 2;
      reasons.push(`Creados en la misma semana`);
    }

    // Penalizaciones
    // Si hay muchas entradas del histórico con el mismo monto, reducir confianza
    if (reasons.some(r => r.includes('Monto'))) {
      // Esta penalización se podría calcular dinámicamente
      // Por ahora, aplicamos una penalización fija si solo coincide el monto
      if (reasons.length === 1 && reasons[0].includes('Monto')) {
        confidence -= 10;
        reasons.push(`Penalización: solo coincide monto`);
      }
    }

    const primaryReason = reasons.length > 0 ? reasons[0] : 'Sin coincidencias';

    return {
      confidence: Math.max(0, Math.min(100, confidence)),
      primaryReason,
      allReasons: reasons
    };
  }

  /**
   * Enlaza un movimiento con una entrada del histórico
   */
  private async linkMovementAndHistory(movement: any, historyEntry: any): Promise<void> {
    await Promise.all([
      this.movementModel.findByIdAndUpdate(
        movement._id,
        { contractHistoryEntry: historyEntry._id }
      ),
      this.contractHistoryModel.findByIdAndUpdate(
        historyEntry._id,
        { relatedMovement: movement._id }
      )
    ]);
  }

  /**
   * Sanitiza datos del movimiento para el reporte
   */
  private sanitizeMovementData(movement: any) {
    return {
      _id: movement._id,
      amount: movement.amount,
      date: movement.date,
      type: movement.type,
      direction: movement.direction,
      detail: movement.detail,
      vehicle: movement.vehicle,
      beneficiary: movement.beneficiary,
      createdAt: movement.createdAt
    };
  }

  /**
   * Sanitiza datos del histórico para el reporte
   */
  private sanitizeHistoryData(historyEntry: any) {
    return {
      _id: historyEntry._id,
      action: historyEntry.action,
      details: historyEntry.details,
      eventMetadata: historyEntry.eventMetadata,
      createdAt: historyEntry.createdAt
    };
  }

  /**
   * Crea enlaces manuales basados en IDs específicos
   */
  async createManualLink(movementId: string, historyId: string, reason: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const movement = await this.movementModel.findById(movementId);
      const historyEntry = await this.contractHistoryModel.findById(historyId);

      if (!movement) {
        return { success: false, message: 'Movimiento no encontrado' };
      }

      if (!historyEntry) {
        return { success: false, message: 'Entrada de histórico no encontrada' };
      }

      if (movement.contractHistoryEntry) {
        return { success: false, message: 'El movimiento ya tiene un enlace' };
      }

      if (historyEntry.relatedMovement) {
        return { success: false, message: 'La entrada de histórico ya tiene un enlace' };
      }

      await this.linkMovementAndHistory(movement, historyEntry);

      return {
        success: true,
        message: 'Enlace manual creado exitosamente',
        data: {
          movementId,
          historyId,
          reason,
          createdAt: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Error creando enlace manual: ${error.message}`
      };
    }
  }
}