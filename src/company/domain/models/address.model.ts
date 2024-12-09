import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { ICoordsTypes } from '../types/coords.type';

export class AddressModel extends BaseModel {
  private _street: string;
  private _number: string;
  private _state: string;
  private _city: string;
  private _country: string;
  private _postalCode: string;
  private _coords: ICoordsTypes;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      street: this._street,
      number: this._number,
      state: this._state,
      city: this._city,
      country: this._country,
      postalCode: this._postalCode,
      coords: this._coords ?? null,
    };
  }

  static create(address: any): AddressModel {
    const newAddress = new AddressModel(new Identifier(address._id));

    newAddress._street = address.street;
    newAddress._number = address.number;
    newAddress._state = address.state;
    newAddress._city = address.city;
    newAddress._country = address.country;
    newAddress._postalCode = address.postalCode;
    newAddress._coords = address.coords;

    return newAddress;
  }

  static hydrate(address: any): AddressModel {
    const newAddress = new AddressModel(new Identifier(address._id));

    newAddress._street = address.street;
    newAddress._number = address.number;
    newAddress._state = address.state;
    newAddress._city = address.city;
    newAddress._country = address.country;
    newAddress._postalCode = address.postalCode;
    newAddress._coords = address.coords ?? null;

    return newAddress;
  }
}
