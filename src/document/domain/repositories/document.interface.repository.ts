import { DocumentModel } from '../models/document.model';

export interface IDocumentRepository {
  findValue(value: string): Promise<DocumentModel>;
  create(document: DocumentModel): Promise<DocumentModel>;
}
