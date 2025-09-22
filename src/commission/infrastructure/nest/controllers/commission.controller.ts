import { Controller, Get, HttpCode, Inject, Param, Put, Query, UseGuards } from '@nestjs/common';
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

  @Get('owner/:ownerId')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return commissions by owner' })
  @ApiResponse({ status: 404, description: 'Commissions not found' })
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERVISOR, TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  async listByOwner(@Param('ownerId') ownerId: string, @Query('status') status?: 'PENDING' | 'PAID' | 'CANCELLED') {
    return this.service.listByOwner(ownerId, { status });
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
