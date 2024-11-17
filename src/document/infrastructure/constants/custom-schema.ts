import {
  CatDocument,
  CatDocumentSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-document.schema';
import {
  Document,
  DocumentSchema,
} from '../../../core/infrastructure/mongo/schemas/public/documet.schema';

export const documentSchema = {
  name: Document.name,
  schema: DocumentSchema,
};

export const catDocumentSchema = {
  name: CatDocument.name,
  schema: CatDocumentSchema,
};
