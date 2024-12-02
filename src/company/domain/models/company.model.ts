import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { UserModel } from './user.model';

export class CompanyModel extends BaseModel {
  private _name: string;
  private _users: UserModel[];

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      users: this._users ? this._users : null,
    };
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
    newCompany._users = company.users
      ? company.users.map((user: any) => UserModel.hydrate(user))
      : [];

    return newCompany;
  }
}
