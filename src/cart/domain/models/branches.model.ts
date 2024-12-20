import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';


export class BranchesModel extends BaseModel {
  private _name: string;


  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
    };
  }

  static create(branches: any): BranchesModel {
    const newBranches = new BranchesModel(new Identifier(branches._id));

    newBranches._name = branches.name;

    return newBranches;
  }

  static hydrate(branches: any): BranchesModel {
    const newBranches = new BranchesModel(new Identifier(branches._id));

    newBranches._name = branches.name;

    return newBranches;
  }
}
