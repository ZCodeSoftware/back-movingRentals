import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IBranchesService } from '../../../domain/services/branches.interface.service';
import SymbolsBranches from '../../../symbols-branches';
import { CreateBranchesDTO } from '../dtos/branches.dto';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(
    @Inject(SymbolsBranches.IBranchesService)
    private readonly branchesService: IBranchesService,
  ) {}

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
