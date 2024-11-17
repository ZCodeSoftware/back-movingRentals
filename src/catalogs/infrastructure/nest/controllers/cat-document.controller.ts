import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatDocumentModel } from '../../../domain/models/cat-document.model';
import { ICatDocumentService } from '../../../domain/services/cat-document.interface.service';
import SymbolsCatalogs from '../../../symbols-catalogs';
import { CreateCatDocumentDTO } from '../dtos/cat-document.dto';
import { CatCatDocumentResponseDTO } from '../dtos/responses/cat-document.dto';

@ApiTags('Cat Documents')
@Controller('cat-document')
export class CatDocumentController {
  constructor(
    @Inject(SymbolsCatalogs.ICatDocumentService)
    private readonly catDocumentService: ICatDocumentService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Return all cat documents' })
  @ApiResponse({ status: 404, description: 'Cat Document not found' })
  @ApiResponse({ type: CatCatDocumentResponseDTO })
  async findAll(): Promise<CatDocumentModel[]> {
    return this.catDocumentService.findAll();
  }

  @Get('/:name')
  @ApiResponse({ status: 200, description: 'Return Cat Document by name' })
  @ApiResponse({ status: 404, description: 'Cat Document not found' })
  @ApiResponse({ type: CatCatDocumentResponseDTO })
  async findById(@Param('name') name: string): Promise<CatDocumentModel> {
    return await this.catDocumentService.findByName(name);
  }

  @Post()
  @ApiResponse({ status: 201, description: 'Cat Document created' })
  @ApiResponse({
    status: 400,
    description: 'Cat Document shouldn´t be created',
  })
  @ApiResponse({ type: CatCatDocumentResponseDTO })
  @ApiBody({ type: CreateCatDocumentDTO })
  async create(
    @Body() catDocument: CreateCatDocumentDTO,
  ): Promise<CatDocumentModel> {
    return this.catDocumentService.create(catDocument);
  }
}
