import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatDocumentModel } from '../../../domain/models/cat-document.model';
import { ICatDocumentService } from '../../../domain/services/cat-document.interface.service';
import SymbolsCatalogs from '../../../symbols-catalogs';
import { CreateDocumentDTO } from '../dtos/cat-document.dto';
import { CatDocumentResponseDTO } from '../dtos/responses/cat-document.dto';

@ApiTags('Documents')
@Controller('document')
export class CatDocumentController {
  constructor(
    @Inject(SymbolsCatalogs.ICatDocumentService)
    private readonly catDocumentService: ICatDocumentService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Return all documents' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ type: CatDocumentResponseDTO })
  async findAll(): Promise<CatDocumentModel[]> {
    return this.catDocumentService.findAll();
  }

  @Get('/:name')
  @ApiResponse({ status: 200, description: 'Return Document by name' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ type: CatDocumentResponseDTO })
  async findById(@Param('name') name: string): Promise<CatDocumentModel> {
    return await this.catDocumentService.findByName(name);
  }

  @Post()
  @ApiResponse({ status: 201, description: 'Document created' })
  @ApiResponse({ status: 400, description: 'Document shouldn´t be created' })
  @ApiResponse({ type: CatDocumentResponseDTO })
  @ApiBody({ type: CreateDocumentDTO })
  async create(
    @Body() catDocument: CreateDocumentDTO,
  ): Promise<CatDocumentModel> {
    return this.catDocumentService.create(catDocument);
  }
}
