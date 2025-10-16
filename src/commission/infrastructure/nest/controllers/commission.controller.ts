import { Controller, Get, HttpCode, Inject, Put, Query, UseGuards, Param } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import SymbolsCommission from '../../../symbols-commission';
import { ICommissionService } from '../../../domain/services/commission.interface.service';

@ApiTags('Commissions')
@Controller('commissions')
export class CommissionController {
  constructor(
    @Inject(SymbolsCommission.ICommissionService)
    private readonly service: ICommissionService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return commissions with filters' })
  @ApiResponse({ status: 404, description: 'Commissions not found' })
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERVISOR, TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiQuery({ name: 'ownerId', required: false, type: 'string', description: 'Filter by vehicle owner ID' })
  @ApiQuery({ name: 'vehicleOwner', required: false, type: 'string', description: 'Filter by vehicle owner ID (alias for ownerId)' })
  @ApiQuery({ name: 'bookingNumber', required: false, type: 'number', description: 'Filter by booking number' })
  @ApiQuery({ name: 'vehicle', required: false, type: 'string', description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'status', required: false, type: 'string', description: 'Filter by status (PENDING, PAID, CANCELLED)' })
  @ApiQuery({ name: 'source', required: false, type: 'string', description: 'Filter by source (booking, extension). If not provided, returns all' })
  @ApiQuery({ name: 'startDate', required: false, type: 'string', description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string', description: 'Filter by end date (ISO format)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async listByOwner(
    @Query('ownerId') ownerId?: string,
    @Query('vehicleOwner') vehicleOwner?: string,
    @Query('bookingNumber') bookingNumber?: string,
    @Query('vehicle') vehicle?: string,
    @Query('status') status?: 'PENDING' | 'PAID' | 'CANCELLED',
    @Query('source') source?: 'booking' | 'extension',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // vehicleOwner es un alias para ownerId
    const ownerIdToUse = vehicleOwner || ownerId || '';
    
    return this.service.listByOwner(ownerIdToUse, { 
      status, 
      source,
      vehicle,
      bookingNumber: bookingNumber ? parseInt(bookingNumber, 10) : undefined,
      startDate,
      endDate,
      page, 
      limit 
    });
  }

  @Put(':id/pay')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Commission marked as paid' })
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERVISOR, TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  async pay(@Param('id') id: string) {
    return this.service.pay(id);
  }
}
