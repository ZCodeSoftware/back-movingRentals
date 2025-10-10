import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeCatTypeMovement } from '../../../../core/domain/enums/type-cat-type-movement';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import { IMovementService } from '../../../domain/services/movement.interface.service';
import SymbolsMovement from '../../../symbols-movement';
import { CreateMovementDTO } from '../dtos/movement.dto';
import { UpdateMovementDTO } from '../dtos/movement-update.dto';
import { DeleteMovementDTO } from '../dtos/movement-delete.dto';

@ApiTags('movement')
@Controller('movement')
export class MovementController {
  constructor(
    @Inject(SymbolsMovement.IMovementService)
    private readonly movementService: IMovementService,
  ) { }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Movement created' })
  @ApiResponse({ status: 400, description: `Movement shouldn't be created` })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({
    type: CreateMovementDTO,
    description: 'Data to create a Movement',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async create(@Body() body: CreateMovementDTO, @Req() req: IUserRequest) {
    const { _id } = req.user;
    return this.movementService.create(body, _id);
  }

  @Get()
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'Return all Movements with pagination',
  })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: ['IN', 'OUT'],
    description: 'Filter by movement direction (IN for income, OUT for expense)',
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
    name: 'beneficiaryModel',
    required: false,
    type: 'string',
    description: 'Filter by beneficiary model ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TypeCatTypeMovement,
    description: 'Filter by vehicle owner model ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Filter by start date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'Filter by end date',
  })
  @ApiQuery({
    name: "vehicleId",
    required: false,
    type: "string",
    description: 'Filter by vehicle id'
  })
  @Roles(TypeRoles.SUPERADMIN, TypeRoles.ADMIN, TypeRoles.SELLER, TypeRoles.SUPERVISOR)
  @UseGuards(AuthGuards, RoleGuard)
  async findAll(@Query() filters: any, @Req() req: IUserRequest) {
    if (filters.lang) {
      delete filters.lang;
    }
    return this.movementService.findAll(filters, req.user._id);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return Movement by id' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  @Roles(TypeRoles.SUPERADMIN, TypeRoles.ADMIN, TypeRoles.SELLER, TypeRoles.SUPERVISOR)
  @UseGuards(AuthGuards, RoleGuard)
  async findById(@Param('id') id: string) {
    return this.movementService.findById(id);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Movement updated' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  @Roles(TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  async update(@Param('id') id: string, @Body() body: UpdateMovementDTO) {
    return this.movementService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Elimina un movimiento (soft delete)',
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
  @ApiBody({
    type: DeleteMovementDTO,
    description: 'Datos para la eliminación del movimiento',
    required: false,
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async deleteMovement(
    @Param('id') movementId: string,
    @Body() body: DeleteMovementDTO,
    @Req() req: IUserRequest,
  ) {
    const deletedMovement = await this.movementService.deleteMovement(
      movementId,
      req.user._id,
      body.reason,
    );

    return {
      success: true,
      message: 'Movimiento eliminado exitosamente',
      data: deletedMovement,
    };
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Restaura un movimiento eliminado',
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
  async restoreMovement(@Param('id') movementId: string) {
    const restoredMovement = await this.movementService.restoreMovement(movementId);

    return {
      success: true,
      message: 'Movimiento restaurado exitosamente',
      data: restoredMovement,
    };
  }

  @Get('deleted/list')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtiene los movimientos eliminados',
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
              type: { type: 'string' },
              direction: { type: 'string' },
              detail: { type: 'string' },
              amount: { type: 'number' },
              deletedBy: { type: 'object' },
              deletedAt: { type: 'string', format: 'date-time' },
              deletionReason: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  @ApiQuery({
    name: 'vehicle',
    required: false,
    type: 'string',
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'beneficiary',
    required: false,
    type: 'string',
    description: 'Filter by beneficiary ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TypeCatTypeMovement,
    description: 'Filter by movement type',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async getDeletedMovements(@Query() filters: any) {
    const deletedMovements = await this.movementService.getDeletedMovements(filters);

    return {
      success: true,
      message: 'Movimientos eliminados obtenidos exitosamente',
      data: deletedMovements,
    };
  }
}
