import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatContractEventModel extends BaseModel {
  private _name: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
    };
  }

  private static initialize(model: any): CatContractEventModel {
    const m = new CatContractEventModel(new Identifier(model._id));
    m._name = model.name;
    return m;
  }

  static create(model: any): CatContractEventModel {
    return this.initialize(model);
  }

  static hydrate(model: any): CatContractEventModel {
    return this.initialize(model);
  }
}
