import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IBranchesService } from '../../../domain/services/branches.interface.service';
import SymbolsBranches from '../../../symbols-branches';
import { CreateBranchesDTO, CreateCarouselDTO } from '../dtos/branches.dto';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(
    @Inject(SymbolsBranches.IBranchesService)
    private readonly branchesService: IBranchesService,
  ) { }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Branches created' })
  @ApiResponse({ status: 400, description: `Branches shouldn't be created` })
  @ApiBody({
    type: CreateBranchesDTO,
    description: 'Data to create a Branches',
  })
  async create(@Body() body: CreateBranchesDTO) {
    return this.branchesService.create(body);
  }

  @Post('carousel/:id')
  @HttpCode(201)
  @Roles(TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 201, description: 'Carousel created' })
  @ApiResponse({ status: 400, description: `Carousel shouldn't be created` })
  @ApiBody({
    type: [CreateCarouselDTO],
    description: 'Data to create a Branches',
  })
  async createCarousel(@Param('id') id: string, @Body() body: CreateCarouselDTO[]) {
    return this.branchesService.createCarousel(body, id);
  }

  @Get()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return all Branchess' })
  @ApiResponse({ status: 404, description: 'Branches not found' })
  async findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return Branches by id' })
  @ApiResponse({ status: 404, description: 'Branches not found' })
  async findById(@Param('id') id: string) {
    return this.branchesService.findById(id);
  }
}
