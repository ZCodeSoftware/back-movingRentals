import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCountryModel } from './cat-country.model';

export class AddressModel extends BaseModel {
  private _street: string;
  private _number: string;
  private _state: string;
  private _city: string;
  private _country: CatCountryModel;
  private _postalCode: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      street: this._street,
      number: this._number,
      state: this._state,
      city: this._city,
      country: this._country ? this._country.toJSON() : null,
      postalCode: this._postalCode,
    };
  }

  addCountry(country: CatCountryModel) {
    this._country = country;
  }

  static create(address: any): AddressModel {
    const newAddress = new AddressModel(new Identifier(address._id));

    newAddress._street = address.street;
    newAddress._number = address.number;
    newAddress._state = address.state;
    newAddress._city = address.city;
    newAddress._postalCode = address.postalCode;

    return newAddress;
  }

  static hydrate(address: any): AddressModel {
    const newAddress = new AddressModel(new Identifier(address._id));

    newAddress._street = address.street;
    newAddress._number = address.number;
    newAddress._state = address.state;
    newAddress._city = address.city;
    newAddress._country = address.country
      ? CatCountryModel.hydrate(address.country)
      : null;
    newAddress._postalCode = address.postalCode;

    return newAddress;
  }
}
