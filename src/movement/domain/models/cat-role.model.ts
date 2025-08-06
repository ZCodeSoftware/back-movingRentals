import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatRoleModel extends BaseModel {
  private _name: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
    };
  }

  private static initializeRole(role: any): CatRoleModel {
    const newRole = new CatRoleModel(new Identifier(role._id));
    newRole._name = role.name;
    return newRole;
  }

  static create(role: any): CatRoleModel {
    return this.initializeRole(role);
  }

  static hydrate(role: any): CatRoleModel {
    return this.initializeRole(role);
  }
}
