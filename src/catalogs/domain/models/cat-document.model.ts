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

  private static initializeDocument(role: any): CatDocumentModel {
    const newRole = new CatDocumentModel(new Identifier(role._id));
    newRole._name = role.name;
    return newRole;
  }

  static create(role: any): CatDocumentModel {
    return this.initializeDocument(role);
  }

  static hydrate(role: any): CatDocumentModel {
    return this.initializeDocument(role);
  }
}
