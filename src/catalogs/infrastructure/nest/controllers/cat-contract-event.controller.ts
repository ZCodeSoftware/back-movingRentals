import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import SymbolsCatalogs from '../../../symbols-catalogs';
import { ICatContractEventService } from '../../../domain/services/cat-contract-event.interface.service';
import { CatContractEventModel } from '../../../domain/models/cat-contract-event.model';
import { CreateContractEventDTO } from '../dtos/cat-contract-event.dto';

@ApiTags('Cat-Contract-Event')
@Controller('cat-contract-event')
export class CatContractEventController {
  constructor(
    @Inject(SymbolsCatalogs.ICatContractEventService)
    private readonly service: ICatContractEventService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'CatContractEvent created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiBody({ type: CreateContractEventDTO, description: 'Create CatContractEvent' })
  async create(@Body() dto: CreateContractEventDTO): Promise<CatContractEventModel> {
    return this.service.create(dto);
  }

  @Get()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'CatContractEvent found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findAll(): Promise<CatContractEventModel[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'CatContractEvent found' })
  @ApiResponse({ status: 404, description: 'CatContractEvent not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findById(@Param('id') id: string): Promise<CatContractEventModel> {
    return this.service.findById(id);
  }
}
