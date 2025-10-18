import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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

  @Get()
  @HttpCode(200)
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
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
  @ApiBody({
    type: UpdateContractDTO,
    description: 'Data to update a Contract',
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

    return this.contractService.update(id, contractData, req.user._id);
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
}
