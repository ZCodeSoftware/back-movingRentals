import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import { DocumentService } from '../../application/services/document.service';
import SymbolsDocument from '../../symbols-document';
import { CatDocumentRepository } from '../mongo/repositories/cat-document.repository';
import { DocumentRepository } from '../mongo/repositories/document.repository';

export const documentRepository = {
  provide: SymbolsDocument.IDocumentRepository,
  useClass: DocumentRepository,
};

export const documentService = {
  provide: SymbolsDocument.IDocumentService,
  useClass: DocumentService,
};

export const catDocumentRepository = {
  provide: SymbolsCatalogs.ICatDocumentRepository,
  useClass: CatDocumentRepository,
};
