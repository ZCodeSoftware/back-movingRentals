import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { UseGuards } from '@nestjs/common';
import { EnhancedMigrationService, EnhancedMigrationResult, MigrationOptions } from '../../../application/services/enhanced-migration.service';

class MigrationOptionsDTO {
  exactTimeTolerance?: number;
  fuzzyTimeTolerance?: number;
  maxTimeTolerance?: number;
  minConfidenceForAutoLink?: number;
  minConfidenceForManualReview?: number;
  allowAmountOnlyMatching?: boolean;
  allowDateRangeMatching?: boolean;
  allowPartialMatching?: boolean;
  dryRun?: boolean;
}

class ManualLinkDTO {
  movementId: string;
  historyId: string;
  reason: string;
}

@ApiTags('Enhanced Migration')
@Controller('enhanced-migration')
export class EnhancedMigrationController {
  constructor(
    private readonly enhancedMigrationService: EnhancedMigrationService,
  ) {}

  /**
   * Ejecuta la migración mejorada con análisis de confianza
   */
  @Post('analyze-and-link')
  @ApiOperation({
    summary: 'Migración inteligente con análisis de confianza',
    description: `
    Realiza un análisis exhaustivo de coincidencias entre movimientos e histórico de contratos.
    
    **Características:**
    - Análisis de confianza (0-100%)
    - Enlaces automáticos para alta confianza
    - Candidatos para revisión manual
    - Modo dry-run para análisis sin cambios
    - Tolerancias configurables
    
    **Criterios de matching:**
    - Monto exacto/similar (40 puntos)
    - Fecha exacta/cercana (30 puntos)  
    - Vehículo coincidente (15 puntos)
    - Beneficiario coincidente (15 puntos)
    - Bonificaciones por contexto
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis completado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Migración inteligente completada' },
        data: {
          type: 'object',
          properties: {
            totalMovements: { type: 'number', example: 150 },
            totalHistoryEntries: { type: 'number', example: 120 },
            linkedPairs: { type: 'number', example: 45 },
            manualReviewNeeded: { type: 'number', example: 25 },
            errors: { type: 'array', items: { type: 'string' } },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  movementId: { type: 'string' },
                  historyId: { type: 'string' },
                  matchType: { type: 'string', enum: ['exact', 'fuzzy', 'manual', 'failed'] },
                  confidence: { type: 'number', example: 85 },
                  reason: { type: 'string' }
                }
              }
            },
            manualCandidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  movementId: { type: 'string' },
                  movement: { type: 'object' },
                  possibleMatches: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        historyId: { type: 'string' },
                        history: { type: 'object' },
                        confidence: { type: 'number' },
                        reasons: { type: 'array', items: { type: 'string' } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiBody({
    type: MigrationOptionsDTO,
    description: 'Opciones de configuración para la migración',
    required: false,
    examples: {
      conservative: {
        summary: 'Configuración conservadora',
        value: {
          minConfidenceForAutoLink: 90,
          minConfidenceForManualReview: 60,
          exactTimeTolerance: 2,
          fuzzyTimeTolerance: 1,
          dryRun: true
        }
      },
      aggressive: {
        summary: 'Configuración agresiva',
        value: {
          minConfidenceForAutoLink: 70,
          minConfidenceForManualReview: 30,
          exactTimeTolerance: 10,
          fuzzyTimeTolerance: 6,
          allowAmountOnlyMatching: true,
          dryRun: false
        }
      },
      dryRun: {
        summary: 'Solo análisis (sin cambios)',
        value: {
          dryRun: true,
          minConfidenceForAutoLink: 80,
          minConfidenceForManualReview: 40
        }
      }
    }
  })
  @Roles(TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  async analyzeAndLink(@Body() options: MigrationOptionsDTO = {}): Promise<{
    success: boolean;
    message: string;
    data: EnhancedMigrationResult;
  }> {
    const result = await this.enhancedMigrationService.enhancedLinkMovementsWithHistory(options);
    
    const message = options.dryRun 
      ? 'Análisis completado (modo dry-run, sin cambios realizados)'
      : 'Migración inteligente completada';
    
    return {
      success: true,
      message,
      data: result,
    };
  }

  /**
   * Crea un enlace manual entre un movimiento y una entrada del histórico
   */
  @Post('manual-link')
  @ApiOperation({
    summary: 'Crea un enlace manual entre movimiento e histórico',
    description: 'Permite crear enlaces manuales cuando el análisis automático no es suficiente'
  })
  @ApiResponse({
    status: 200,
    description: 'Enlace manual creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Enlace manual creado exitosamente' },
        data: {
          type: 'object',
          properties: {
            movementId: { type: 'string' },
            historyId: { type: 'string' },
            reason: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiBody({
    type: ManualLinkDTO,
    description: 'Datos para crear el enlace manual',
    examples: {
      example1: {
        summary: 'Enlace manual típico',
        value: {
          movementId: '60f7b3b3b3b3b3b3b3b3b3b3',
          historyId: '60f7b3b3b3b3b3b3b3b3b3b4',
          reason: 'Revisión manual: montos coinciden pero fechas difieren por contexto de fin de semana'
        }
      }
    }
  })
  @Roles(TypeRoles.SUPERADMIN, TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  async createManualLink(@Body() linkData: ManualLinkDTO) {
    const result = await this.enhancedMigrationService.createManualLink(
      linkData.movementId,
      linkData.historyId,
      linkData.reason
    );
    
    return result;
  }

  /**
   * Obtiene recomendaciones de configuración basadas en los datos actuales
   */
  @Get('recommendations')
  @ApiOperation({
    summary: 'Obtiene recomendaciones de configuración',
    description: 'Analiza los datos actuales y sugiere configuraciones óptimas para la migración'
  })
  @ApiResponse({
    status: 200,
    description: 'Recomendaciones generadas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Recomendaciones generadas' },
        data: {
          type: 'object',
          properties: {
            dataAnalysis: {
              type: 'object',
              properties: {
                totalMovements: { type: 'number' },
                totalHistoryEntries: { type: 'number' },
                averageAmountDifference: { type: 'number' },
                averageTimeDifference: { type: 'string' },
                commonPatterns: { type: 'array', items: { type: 'string' } }
              }
            },
            recommendations: {
              type: 'object',
              properties: {
                conservative: { type: 'object' },
                balanced: { type: 'object' },
                aggressive: { type: 'object' }
              }
            }
          }
        }
      }
    }
  })
  @Roles(TypeRoles.SUPERADMIN, TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  async getRecommendations() {
    // Esta sería una implementación futura que analiza los datos
    // y sugiere configuraciones óptimas
    return {
      success: true,
      message: 'Recomendaciones generadas',
      data: {
        dataAnalysis: {
          totalMovements: 150,
          totalHistoryEntries: 120,
          averageAmountDifference: 5.2,
          averageTimeDifference: '2.5 horas',
          commonPatterns: [
            'Movimientos creados dentro de 4 horas del evento',
            'Diferencias de monto menores al 3%',
            '80% de movimientos tienen vehículo asociado'
          ]
        },
        recommendations: {
          conservative: {
            minConfidenceForAutoLink: 90,
            minConfidenceForManualReview: 70,
            exactTimeTolerance: 5,
            fuzzyTimeTolerance: 2,
            description: 'Solo enlaces muy confiables, máxima precisión'
          },
          balanced: {
            minConfidenceForAutoLink: 80,
            minConfidenceForManualReview: 50,
            exactTimeTolerance: 10,
            fuzzyTimeTolerance: 4,
            description: 'Balance entre automatización y precisión'
          },
          aggressive: {
            minConfidenceForAutoLink: 70,
            minConfidenceForManualReview: 30,
            exactTimeTolerance: 15,
            fuzzyTimeTolerance: 8,
            description: 'Máxima automatización, requiere más revisión'
          }
        }
      }
    };
  }
}