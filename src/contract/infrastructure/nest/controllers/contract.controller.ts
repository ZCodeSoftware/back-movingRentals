import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import { IContractService } from '../../../domain/services/contract.interface.service';
import SymbolsContract from '../../../symbols-contract';
import {
  CreateContractDTO,
  DeleteHistoryEntryDTO,
  ReportEventDTO,
  UpdateContractDTO,
} from '../dtos/contract.dto';

@ApiTags('Contract')
@Controller('contract')
export class ContractController {
  constructor(
    @Inject(SymbolsContract.IContractService)
    private readonly contractService: IContractService,
  ) { }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({ status: 400, description: `Contract shouldn't be created` })
  @ApiBody({
    type: CreateContractDTO,
    description: 'Data to create a Contract. Use sendEmail=false to skip email notification to client.',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
    TypeRoles.USER,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async create(@Body() body: CreateContractDTO, @Req() req: IUserRequest) {
    const { _id } = req.user;

    const contractData = {
      ...body,
      extension: body.extension
        ? {
          ...body.extension,
          newEndDateTime: body.extension.newEndDateTime
            ? body.extension.newEndDateTime
            : undefined,
        }
        : undefined,
      // Si sendEmail no se especifica, por defecto es true para mantener compatibilidad
      sendEmail:
        typeof body.sendEmail === 'string'
          ? body.sendEmail === 'true'
          : body.sendEmail !== undefined
            ? body.sendEmail
            : true,
    };

    return this.contractService.create(contractData, _id);
  }

  @Get('list-minimal')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'Return minimal contract data for select lists (only _id, bookingNumber, email, name, lastName)',
  })
  @ApiResponse({ status: 404, description: 'Contracts not found' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Search in booking number, email, name, or last name',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Number of items to return (default: 100)',
  })
  async findAllMinimal(@Query() filters: any) {
    if (filters.lang) {
      delete filters.lang;
    }
    if (filters.limit) {
      filters.limit = parseInt(filters.limit, 10);
    } else {
      filters.limit = 100; // Default limit
    }

    return this.contractService.findAllMinimal(filters);
  }

  @Get()
  @HttpCode(200)
  /*   @Roles(
      TypeRoles.ADMIN,
      TypeRoles.SELLER,
      TypeRoles.SUPERVISOR,
      TypeRoles.SUPERADMIN,
    )
    @UseGuards(AuthGuards, RoleGuard) */
  @ApiResponse({
    status: 200,
    description: 'Return all Contracts with pagination',
  })
  @ApiResponse({ status: 404, description: 'Contracts not found' })
  @ApiQuery({
    name: 'bookingNumber',
    required: false,
    type: 'number',
    description: 'Filter by booking number',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'Filter by status ID',
  })
  @ApiQuery({
    name: 'reservingUser',
    required: false,
    type: 'string',
    description: 'Filter by reserving user email',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Search in reserving user name, last name, email, or full name (name + last name)',
  })
  @ApiQuery({
    name: 'createdByUser',
    required: false,
    type: 'string',
    description: 'Filter by created by user ID',
  })
  @ApiQuery({
    name: 'service',
    required: false,
    type: 'string',
    description:
      'Filter by service name inside booking cart (vehicle, tour, ticket, transfer)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'isReserve',
    required: false,
    type: 'boolean',
    description: 'Filter by reservation status (from booking)',
  })
  @ApiQuery({
    name: 'createdAtStart',
    required: false,
    type: 'string',
    description: 'Filter by contract creation date start (ISO 8601 format: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'createdAtEnd',
    required: false,
    type: 'string',
    description: 'Filter by contract creation date end (ISO 8601 format: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'reservationDateStart',
    required: false,
    type: 'string',
    description: 'Filtro por fecha de inicio de reserva. Si se proporciona solo esta fecha, busca reservas que inicien exactamente en esa fecha. Si se proporciona junto con reservationDateEnd, busca reservas que inicien desde esta fecha (ISO 8601 format: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'reservationDateEnd',
    required: false,
    type: 'string',
    description: 'Filtro por fecha de fin de reserva. Si se proporciona solo esta fecha, busca reservas que inicien exactamente en esa fecha. Si se proporciona junto con reservationDateStart, busca reservas que inicien hasta esta fecha (ISO 8601 format: YYYY-MM-DD). NOTA: Siempre se compara con la fecha de INICIO de la reserva, no con la fecha de finalización.',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    type: 'string',
    description: 'Filter by payment method ID',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    type: 'string',
    description: 'Filter by vehicle ID (includes historical vehicles - vehicles that were in the booking at any point)',
  })
  @ApiQuery({
    name: 'vehicleTag',
    required: false,
    type: 'string',
    description: 'Filter by vehicle tag/name (for display purposes)',
  })
  @ApiQuery({
    name: 'currentVehicleOnly',
    required: false,
    type: 'boolean',
    description: 'When true, only returns bookings where the vehicle is currently active (not historical). Must be used with vehicleId or service filter.',
  })
  async findAll(@Query() filters: any) {
    if (filters.lang) {
      delete filters.lang;
    }
    if (filters.bookingNumber) {
      filters.bookingNumber = parseInt(filters.bookingNumber, 10);
    }

    if (filters.page) {
      filters.page = parseInt(filters.page, 10);
    }

    if (filters.limit) {
      filters.limit = parseInt(filters.limit, 10);
    }
    
    // Convertir currentVehicleOnly a boolean
    if (filters.currentVehicleOnly !== undefined) {
      filters.currentVehicleOnly = filters.currentVehicleOnly === 'true' || filters.currentVehicleOnly === true;
    }

    return this.contractService.findAll(filters);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'Return Contract by id with booking totals calculated from contract history',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        booking: { type: 'object', description: 'Booking information' },
        reservingUser: { type: 'object', description: 'User who made the reservation' },
        createdByUser: { type: 'object', description: 'User who created the contract' },
        status: { type: 'object', description: 'Contract status' },
        extension: { type: 'object', description: 'Extension information if any' },
        timeline: {
          type: 'array',
          description: 'Contract history timeline',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID del movimiento' },
              action: { type: 'string', description: 'Tipo de acción realizada' },
              details: { type: 'string', description: 'Detalles del movimiento' },
              performedBy: {
                type: 'object',
                description: 'Usuario que realizó el movimiento',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' }
                }
              },
              createdBy: {
                type: 'string',
                description: 'Información del usuario en formato "nombre apellido - email"',
                example: 'Juan Pérez - juan.perez@example.com'
              },
              eventType: { type: 'object', description: 'Tipo de evento del catálogo' },
              eventMetadata: { type: 'object', description: 'Metadatos del evento' },
              changes: { type: 'array', description: 'Cambios realizados' },
              createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Fecha de actualización' }
            }
          }
        },
        bookingTotals: {
          type: 'object',
          description: 'Calculated totals based on contract history',
          properties: {
            originalTotal: { type: 'number', example: 1500.00, description: 'Total original de la reserva' },
            netTotal: { type: 'number', example: 1650.00, description: 'Total neto con ajustes del histórico' },
            adjustments: {
              type: 'array',
              description: 'Ajustes monetarios del histórico del contrato',
              items: {
                type: 'object',
                properties: {
                  eventType: { type: 'string', description: 'ID del tipo de evento' },
                  eventName: { type: 'string', description: 'Nombre del evento' },
                  amount: { type: 'number', description: 'Monto del ajuste' },
                  direction: { type: 'string', enum: ['IN', 'OUT'], description: 'Dirección del movimiento' },
                  date: { type: 'string', format: 'date-time', description: 'Fecha del evento' },
                  details: { type: 'string', description: 'Detalles del evento' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async findById(@Param('id') id: string) {
    const result = await this.contractService.findByIdWithTotals(id);
    if (!result) {
      throw new NotFoundException('Contract not found');
    }
    return result;
  }

  @Get(':id/totals')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'Return booking totals based on contract history',
    schema: {
      type: 'object',
      properties: {
        originalTotal: { type: 'number', example: 1500.00, description: 'Total original de la reserva' },
        netTotal: { type: 'number', example: 1650.00, description: 'Total neto con ajustes del histórico' },
        adjustments: {
          type: 'array',
          description: 'Ajustes monetarios del histórico del contrato',
          items: {
            type: 'object',
            properties: {
              eventType: { type: 'string', description: 'ID del tipo de evento' },
              eventName: { type: 'string', description: 'Nombre del evento' },
              amount: { type: 'number', description: 'Monto del ajuste' },
              direction: { type: 'string', enum: ['IN', 'OUT'], description: 'Dirección del movimiento' },
              date: { type: 'string', format: 'date-time', description: 'Fecha del evento' },
              details: { type: 'string', description: 'Detalles del evento' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async getBookingTotals(@Param('id') id: string) {
    return this.contractService.getBookingTotals(id);
  }

  @Post(':id/report-event')
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  @ApiOperation({
    summary: 'Registra un evento en el timeline e ingresa un movimiento de dinero',
  })
  @ApiBody({
    type: ReportEventDTO,
    description: 'Datos del evento a registrar',
  })
  async reportEvent(
    @Param('id') contractId: string,
    @Body() body: ReportEventDTO,
    @Req() req: any,
  ) {
    const userId = req.user._id;
    return this.contractService.reportEvent(contractId, userId, body);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Contract updated' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiResponse({ 
    status: 409, 
    description: 'Duplicate movement detected - confirmation required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'DUPLICATE_MOVEMENT_DETECTED' },
        duplicateDetails: {
          type: 'object',
          properties: {
            existingMovement: {
              type: 'object',
              properties: {
                _id: { type: 'string', description: 'ID del movimiento existente' },
                eventType: { type: 'string', description: 'Tipo de evento' },
                amount: { type: 'number', description: 'Monto' },
                vehicle: { type: 'string', description: 'Vehículo' },
                date: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
                paymentMethod: { type: 'string', description: 'Método de pago' },
                paymentMedium: { type: 'string', description: 'Medio de pago' }
              }
            }
          }
        }
      }
    }
  })
  @ApiBody({
    type: UpdateContractDTO,
    description: 'Data to update a Contract. Include confirmDuplicate: true to bypass duplicate detection.',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateContractDTO,
    @Req() req: IUserRequest,
  ) {
    try {
      const contractData = {
        ...body,
        extension: body.extension
          ? {
            ...body.extension,
            newEndDateTime: body.extension.newEndDateTime
              ? body.extension.newEndDateTime
              : undefined,
          }
          : undefined,
      };

      return await this.contractService.update(id, contractData, req.user._id);
    } catch (error) {
      // Si es un error de duplicado, devolverlo con código 409
      if (error.message === 'DUPLICATE_MOVEMENT_DETECTED' && error.statusCode === 409) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: 'DUPLICATE_MOVEMENT_DETECTED',
            duplicateDetails: error.duplicateDetails,
          },
          HttpStatus.CONFLICT,
        );
      }
      // Si es otro error, re-lanzarlo
      throw error;
    }
  }

  @Delete('history/:historyId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Elimina un movimiento del histórico del contrato (soft delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Movimiento eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movimiento eliminado exitosamente' },
        data: {
          type: 'object',
          description: 'Datos del movimiento eliminado'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  @ApiResponse({ status: 400, description: 'El movimiento ya está eliminado' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar este tipo de movimiento' })
  @ApiBody({
    type: DeleteHistoryEntryDTO,
    description: 'Datos para la eliminación del movimiento',
    required: false,
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async deleteHistoryEntry(
    @Param('historyId') historyId: string,
    @Body() body: DeleteHistoryEntryDTO,
    @Req() req: IUserRequest,
  ) {
    const deletedEntry = await this.contractService.deleteHistoryEntry(
      historyId,
      req.user._id,
      body.reason,
    );

    return {
      success: true,
      message: 'Movimiento eliminado exitosamente',
      data: deletedEntry,
    };
  }

  @Post('history/:historyId/restore')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Restaura un movimiento eliminado del histórico del contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Movimiento restaurado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movimiento restaurado exitosamente' },
        data: {
          type: 'object',
          description: 'Datos del movimiento restaurado'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  @ApiResponse({ status: 400, description: 'El movimiento no está eliminado' })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async restoreHistoryEntry(@Param('historyId') historyId: string) {
    const restoredEntry = await this.contractService.restoreHistoryEntry(historyId);

    return {
      success: true,
      message: 'Movimiento restaurado exitosamente',
      data: restoredEntry,
    };
  }

  @Get(':id/deleted-history')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtiene los movimientos eliminados de un contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos eliminados',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Movimientos eliminados obtenidos exitosamente' },
        data: {
          type: 'array',
          description: 'Lista de movimientos eliminados',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              action: { type: 'string' },
              details: { type: 'string' },
              performedBy: { type: 'object' },
              createdBy: { type: 'string', description: 'Usuario que creó el movimiento en formato "nombre apellido - email"' },
              deletedBy: { type: 'object' },
              deletedByInfo: { type: 'string', description: 'Usuario que eliminó el movimiento en formato "nombre apellido - email"' },
              deletedAt: { type: 'string', format: 'date-time' },
              deletionReason: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Contrato no encontrado' })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async getDeletedHistoryEntries(@Param('id') contractId: string) {
    const deletedEntries = await this.contractService.getDeletedHistoryEntries(contractId);

    return {
      success: true,
      message: 'Movimientos eliminados obtenidos exitosamente',
      data: deletedEntries,
    };
  }

  // TEMPORAL: Endpoint para verificar enlace entre timeline y movimientos
  @Get('debug/booking/:bookingNumber')
  @HttpCode(200)
  @ApiOperation({
    summary: '[TEMPORAL] Obtiene contrato por número de booking con timeline y movimientos enlazados',
  })
  /*   @Roles(
      TypeRoles.ADMIN,
      TypeRoles.SELLER,
      TypeRoles.SUPERVISOR,
      TypeRoles.SUPERADMIN,
    )
    @UseGuards(AuthGuards, RoleGuard) */
  async getContractWithMovementsByBookingNumber(@Param('bookingNumber') bookingNumber: string) {
    return this.contractService.getContractWithMovementsByBookingNumber(parseInt(bookingNumber, 10));
  }
}
