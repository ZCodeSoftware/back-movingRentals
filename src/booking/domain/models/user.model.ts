import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { BookingModel } from './booking.model';
import { CatRoleModel } from './cat-role.model';

export class UserModel extends BaseModel {
  private _name: string;
  private _lastName: string;
  private _email: string;
  private _password: string;
  private _cellphone: string;
  private _isActive: boolean;
  private _newsletter: boolean;
  private _bookings: BookingModel[];
  private _role: CatRoleModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      lastName: this._lastName,
      email: this._email,
      password: this._password,
      cellphone: this._cellphone,
      isActive: this._isActive,
      newsletter: this._newsletter,
      bookings: this._bookings
        ? this._bookings.map((booking) => booking.toJSON())
        : null,
      role: this._role ? this._role.toJSON() : null,
    };
  }

  addBooking(booking: BookingModel): void {
    if (!this._bookings) {
      this._bookings = [];
    }
    this._bookings.push(booking);
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
    newUser._cellphone = user.cellphone;
    newUser._isActive = user.isActive;
    newUser._newsletter = user.newsletter;
    newUser._bookings = user.bookings
      ? user.bookings.map((booking: BookingModel) => BookingModel.hydrate(booking))
      : [];
    newUser._role = user.role ? CatRoleModel.hydrate(user.role) : null;

    return newUser;
  }
}
