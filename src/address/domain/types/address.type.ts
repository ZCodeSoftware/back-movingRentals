import { ICoordsTypes } from './coords.type';

export interface ICreateAddress {
  street: string;
  number: string;
  state: string;
  city: string;
  country: string;
  postalCode: string;
  coords?: ICoordsTypes;
}
