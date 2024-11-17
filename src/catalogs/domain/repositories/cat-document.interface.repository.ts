import { CatDocumentModel } from '../models/cat-document.model';

export interface ICatDocumentRepository {
  findAll(): Promise<CatDocumentModel[]>;
  findById(carDocumentId: string): Promise<CatDocumentModel>;
  findByName(carDocumentName: string): Promise<CatDocumentModel>;
  create(carDocument: CatDocumentModel): Promise<CatDocumentModel>;
}
