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
import { RoleGuards } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { CatRoleModel } from '../../../../catalogs/domain/models/cat-role.model';
import { CreateRoleDTO } from '../dtos/cat-role.dto';
import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { ICatRoleService } from '../../../../catalogs/domain/services/catalogs.interface.service';
import { CatRoleResponseDTO } from '../dtos/responses/cat-response.dto';

@ApiTags('Roles')
@Controller('role')
export class CatRoleController {
  constructor(
    @Inject(SymbolsCatalogs.ICatRoleService)
    private readonly catRoleService: ICatRoleService,
  ) {}

  @Get()
  @ApiResponse({ type: CatRoleResponseDTO })
  async findAll(): Promise<CatRoleModel[]> {
    return await this.catRoleService.findAll();
  }

  @Post()
  @ApiResponse({ type: CatRoleResponseDTO })
  @ApiBody({ type: CreateRoleDTO })
  async create(@Body() catRole: CreateRoleDTO): Promise<CatRoleModel> {
    return await this.catRoleService.create(catRole);
  }

  @Delete(':carRoleId')
  @UseGuards(RoleGuards)
  @ApiResponse({
    description: 'El rol fue eliminado exitosamente',
  })
  async delete(
    @Param('carRoleId') carRoleId: string,
  ): Promise<{ message: string }> {
    return await this.catRoleService.delete(carRoleId);
  }
}
