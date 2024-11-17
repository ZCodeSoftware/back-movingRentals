import { CatDocumentModel } from '../models/cat-document.model';
import { ICatDocumentCreate } from '../types/cat-document.type';

export interface ICatDocumentService {
  findAll(): Promise<CatDocumentModel[]>;
  findById(carDocumentId: string): Promise<CatDocumentModel>;
  findByName(carDocumentName: string): Promise<CatDocumentModel>;
  create(carDocument: ICatDocumentCreate): Promise<CatDocumentModel>;
}
