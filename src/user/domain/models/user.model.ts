import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { AddressModel } from './address.model';
import { CatRoleModel } from './cat-role.model';
import { DocumentModel } from './document.model';

export class UserModel extends BaseModel {
  private _name: string;
  private _lastName: string;
  private _email: string;
  private _password: string;
  private _role: CatRoleModel;
  private _cellphone: string;
  private _documentation: DocumentModel[];
  private _isActive: boolean;
  private _newsletter: boolean;
  private _cart: string;
  private _address: AddressModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      lastName: this._lastName,
      email: this._email,
      password: this._password,
      role: this._role ? this._role.toJSON() : null,
      cellphone: this._cellphone,
      documentation: this._documentation
        ? this._documentation.map((doc) => doc.toJSON())
        : null,
      isActive: this._isActive,
      newsletter: this._newsletter,
      cart: this._cart,
      address: this._address ? this._address.toJSON() : null,
    };
  }

  addRole(role: CatRoleModel): void {
    this._role = role;
  }

  addAddress(address: AddressModel): void {
    this._address = address;
  }

  static create(user: any): UserModel {
    const newUser = new UserModel(new Identifier(user._id));

    newUser._name = user.name;
    newUser._lastName = user.lastName;
    newUser._email = user.email;
    newUser._password = user.password;
    newUser._cellphone = user.cellphone;
    newUser._isActive = user.isActive;
    newUser._newsletter = user.newsletter;

    return newUser;
  }

  static hydrate(user: any): UserModel {
    const newUser = new UserModel(new Identifier(user._id));

    newUser._name = user.name;
    newUser._lastName = user.lastName;
    newUser._email = user.email;
    newUser._password = user.password;
    newUser._role = user.role ? CatRoleModel.hydrate(user.role) : null;
    newUser._cellphone = user.cellphone;
    newUser._documentation = user.documentation
      ? user.documentation.map((doc: any) => DocumentModel.hydrate(doc))
      : null;
    newUser._isActive = user.isActive;
    newUser._newsletter = user.newsletter;
    newUser._cart = user.cart._id;
    newUser._address = user.address ? AddressModel.hydrate(user.address) : null;

    return newUser;
  }
}
