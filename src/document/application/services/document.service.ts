import { Inject, Injectable } from '@nestjs/common';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import { DocumentModel } from '../../domain/models/document.model';
import { ICatDocumentRepository } from '../../domain/repositories/cat-document.interface.repository';
import { IDocumentRepository } from '../../domain/repositories/document.interface.repository';
import { IDocumentService } from '../../domain/services/document.interface.service';
import { IDocumentCreate } from '../../domain/types/document.type';
import SymbolsDocument from '../../symbols-document';

@Injectable()
export class DocumentService implements IDocumentService {
  constructor(
    @Inject(SymbolsDocument.IDocumentRepository)
    private readonly documentRepository: IDocumentRepository,
    @Inject(SymbolsCatalogs.ICatDocumentRepository)
    private readonly catDocumentRepository: ICatDocumentRepository,
  ) {}

  async findValue(value: string): Promise<DocumentModel> {
    return this.documentRepository.findValue(value);
  }

  async createDocument(document: IDocumentCreate): Promise<DocumentModel> {
    const catDocument = await this.catDocumentRepository.findById(
      document.catDocument,
    );
    const documetModel = DocumentModel.create(document);
    documetModel.addCatDocument(catDocument);

    return await this.documentRepository.create(documetModel);
  }
}
