import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { BranchesModel } from './branches.model';
import { UserModel } from './user.model';

export class CompanyModel extends BaseModel {
  private _name: string;
  private _branches: BranchesModel[];
  private _users: UserModel[];

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      branches: this._branches
        ? this._branches.map((branch) => branch.toJSON())
        : null,
      users: this._users ? this._users.map((user) => user.toJSON()) : null,
    };
  }

  addBranches(branch: BranchesModel): void {
    if (!this._branches) {
      this._branches = [];
    }
    this._branches.push(branch);
  }

  addUser(user: UserModel): void {
    if (!this._users) {
      this._users = [];
    }
    this._users.push(user);
  }

  static create(company: any): CompanyModel {
    const newCompany = new CompanyModel(new Identifier(company._id));

    newCompany._name = company.name;

    return newCompany;
  }

  static hydrate(company: any): CompanyModel {
    const newCompany = new CompanyModel(new Identifier(company._id));

    newCompany._name = company.name;
    newCompany._branches = company.branches
      ? company.branches.map((branch: any) => BranchesModel.hydrate(branch))
      : [];
    newCompany._users = company.users
      ? company.users.map((user: any) => UserModel.hydrate(user))
      : [];

    return newCompany;
  }
}
