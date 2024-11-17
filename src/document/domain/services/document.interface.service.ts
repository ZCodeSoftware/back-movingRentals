import { DocumentModel } from '../models/document.model';
import { IDocumentCreate } from '../types/document.type';

export interface IDocumentService {
  findValue(value: string): Promise<DocumentModel>;
  createDocument(document: IDocumentCreate): Promise<DocumentModel>;
}
