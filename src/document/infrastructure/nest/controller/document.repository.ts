import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentModel } from '../../../domain/models/document.model';
import { IDocumentService } from '../../../domain/services/document.interface.service';
import SymbolsDocument from '../../../symbols-document';
import { DocumentCreateDTO } from '../dtos/document.dto';

@ApiTags('Documents')
@Controller('document')
export class DocumentController {
  constructor(
    @Inject(SymbolsDocument.IDocumentService)
    private readonly documentService: IDocumentService,
  ) {}

  @Get('/:value')
  @ApiResponse({ status: 200, description: 'Return document by value' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ type: DocumentModel })
  async findByValue(@Param('value') value: string): Promise<DocumentModel> {
    return await this.documentService.findValue(value);
  }

  @Post()
  @ApiResponse({ status: 201, description: 'Create a new document' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: DocumentCreateDTO })
  async createDocument(
    @Body() document: DocumentCreateDTO,
  ): Promise<DocumentModel> {
    return await this.documentService.createDocument(document);
  }
}
