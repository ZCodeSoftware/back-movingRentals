import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatDocumentModel } from './cat-document.model';

export class DocumentModel extends BaseModel {
  private _value: string;
  private _catDocument: CatDocumentModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      value: this._value,
      catDocument: this._catDocument ? this._catDocument.toJSON() : null,
    };
  }

  addCatDocument(catDocument: CatDocumentModel): void {
    this._catDocument = catDocument;
  }

  static create(document: any): DocumentModel {
    const newDocument = new DocumentModel(new Identifier(document._id));

    newDocument._value = document.value;

    return newDocument;
  }

  static hydrate(document: any): DocumentModel {
    const newDocument = new DocumentModel(new Identifier(document._id));

    newDocument._value = document.value;
    newDocument._catDocument = document.catDocument
      ? CatDocumentModel.hydrate(document.catDocument)
      : null;

    return newDocument;
  }
}
