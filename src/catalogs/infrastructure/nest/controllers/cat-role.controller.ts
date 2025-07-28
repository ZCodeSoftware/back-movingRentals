import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { CatRoleModel } from '../../../../catalogs/domain/models/cat-role.model';
import { ICatRoleService } from '../../../../catalogs/domain/services/catalogs.interface.service';
import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { CreateRoleDTO } from '../dtos/cat-role.dto';
import { CatRoleResponseDTO } from '../dtos/responses/cat-response.dto';

@ApiTags('Roles')
@Controller('role')
export class CatRoleController {
  constructor(
    @Inject(SymbolsCatalogs.ICatRoleService)
    private readonly catRoleService: ICatRoleService,
  ) { }

  @Get()
  @Roles(TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ type: CatRoleResponseDTO })
  async findAll(): Promise<CatRoleModel[]> {
    return await this.catRoleService.findAll();
  }

  @Post()
  @Roles(TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ type: CatRoleResponseDTO })
  @ApiBody({ type: CreateRoleDTO })
  async create(@Body() catRole: CreateRoleDTO): Promise<CatRoleModel> {
    return await this.catRoleService.create(catRole);
  }

  @Delete(':carRoleId')
  @Roles(TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({
    description: 'El rol fue eliminado exitosamente',
  })
  async delete(
    @Param('carRoleId') carRoleId: string,
  ): Promise<{ message: string }> {
    return await this.catRoleService.delete(carRoleId);
  }
}
