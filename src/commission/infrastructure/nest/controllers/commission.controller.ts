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
  @ApiResponse({ status: 200, description: 'Return commissions by owner' })
  @ApiResponse({ status: 404, description: 'Commissions not found' })
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERVISOR, TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiQuery({ name: 'ownerId', required: false, type: 'string' })
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listByOwner(
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: 'PENDING' | 'PAID' | 'CANCELLED',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listByOwner(ownerId || '', { status, page, limit });
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
