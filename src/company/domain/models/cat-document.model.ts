import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatDocumentModel extends BaseModel {
  private _name: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
    };
  }

  private static initializeDocument(catDocument: any): CatDocumentModel {
    const newCatDocument = new CatDocumentModel(
      new Identifier(catDocument._id),
    );
    newCatDocument._name = catDocument.name;
    return newCatDocument;
  }

  static create(catDocument: any): CatDocumentModel {
    return this.initializeDocument(catDocument);
  }

  static hydrate(catDocument: any): CatDocumentModel {
    return this.initializeDocument(catDocument);
  }
}
