import { Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MigrationResult, MigrationStats, MovementHistoryMigrationService } from '../../../application/services/movement-history-migration.service';

@ApiTags('Movement Migration')
@Controller('movement-migration')
export class MovementMigrationController {
  constructor(
    private readonly migrationService: MovementHistoryMigrationService,
  ) { }

  /**
   * Ejecuta la migración para enlazar movimientos existentes con el histórico
   */
  @Post('link-existing')
  @ApiOperation({
    summary: 'Enlaza movimientos existentes con entradas del histórico de contratos',
    description: 'Busca y enlaza automáticamente movimientos legacy con sus correspondientes entradas en el histórico de contratos basándose en metadatos como monto, fecha, vehículo y beneficiario.'
  })
  @ApiResponse({
    status: 200,
    description: 'Migración completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Migración de enlaces completada' },
        data: {
          type: 'object',
          properties: {
            totalMovements: { type: 'number', example: 150 },
            totalHistoryEntries: { type: 'number', example: 120 },
            linkedPairs: { type: 'number', example: 95 },
            errors: {
              type: 'array',
              items: { type: 'string' },
              example: ['Error procesando movimiento 123: ...']
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  movementId: { type: 'string' },
                  historyId: { type: 'string' },
                  matchType: { type: 'string', enum: ['exact', 'fuzzy', 'failed'] },
                  reason: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  })
  /* @Roles(TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard) */
  async linkExistingMovements(): Promise<{ success: boolean; message: string; data: MigrationResult }> {
    const result = await this.migrationService.linkExistingMovementsWithHistory();

    return {
      success: true,
      message: 'Migración de enlaces completada',
      data: result,
    };
  }

  /**
   * Obtiene estadísticas de los enlaces actuales
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Obtiene estadísticas de enlaces entre movimientos e histórico',
    description: 'Muestra cuántos movimientos y entradas de histórico están enlazados y cuántos no.'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Estadísticas obtenidas' },
        data: {
          type: 'object',
          properties: {
            totalMovements: { type: 'number', example: 150 },
            totalHistoryEntries: { type: 'number', example: 120 },
            movementsWithLinks: { type: 'number', example: 95 },
            movementsWithoutLinks: { type: 'number', example: 55 },
            historyWithLinks: { type: 'number', example: 95 },
            historyWithoutLinks: { type: 'number', example: 25 }
          }
        }
      }
    }
  })
  /* @Roles(TypeRoles.SUPERADMIN, TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard) */
  async getStats(): Promise<{ success: boolean; message: string; data: MigrationStats }> {
    const stats = await this.migrationService.getMigrationStats();

    return {
      success: true,
      message: 'Estadísticas obtenidas',
      data: stats,
    };
  }

  /**
   * Valida la integridad de los enlaces existentes
   */
  @Get('validate')
  @ApiOperation({
    summary: 'Valida la integridad de los enlaces existentes',
    description: 'Verifica que todos los enlaces entre movimientos e histórico sean válidos y bidireccionales.'
  })
  @ApiResponse({
    status: 200,
    description: 'Validación completada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Validación completada' },
        data: {
          type: 'object',
          properties: {
            validLinks: { type: 'number', example: 90 },
            brokenMovementLinks: { type: 'number', example: 2 },
            brokenHistoryLinks: { type: 'number', example: 1 },
            orphanedMovements: {
              type: 'array',
              items: { type: 'string' },
              example: ['60f7b3b3b3b3b3b3b3b3b3b3']
            },
            orphanedHistory: {
              type: 'array',
              items: { type: 'string' },
              example: ['60f7b3b3b3b3b3b3b3b3b3b4']
            }
          }
        }
      }
    }
  })
  /* @Roles(TypeRoles.SUPERADMIN, TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard) */
  async validateLinks() {
    const validation = await this.migrationService.validateLinks();

    return {
      success: true,
      message: 'Validación completada',
      data: validation,
    };
  }

  /**
   * Deshace todos los enlaces (para rollback o testing)
   */
  @Delete('unlink-all')
  @ApiOperation({
    summary: 'Deshace todos los enlaces entre movimientos e histórico',
    description: '⚠️ CUIDADO: Esta operación elimina todos los enlaces existentes. Úsala solo para rollback o testing.'
  })
  @ApiResponse({
    status: 200,
    description: 'Enlaces eliminados exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Todos los enlaces han sido eliminados' },
        data: {
          type: 'object',
          properties: {
            unlinkedMovements: { type: 'number', example: 95 },
            unlinkedHistory: { type: 'number', example: 95 }
          }
        }
      }
    }
  })
  /* @Roles(TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard) */
  async unlinkAll() {
    const result = await this.migrationService.unlinkAllMovementsAndHistory();

    return {
      success: true,
      message: 'Todos los enlaces han sido eliminados',
      data: result,
    };
  }
}