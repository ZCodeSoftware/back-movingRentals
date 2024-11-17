import { CatDocumentModel } from '../models/cat-document.model';

export interface ICatDocumentRepository {
  findById(carDocumentId: string): Promise<CatDocumentModel>;
}
