import { AddressModel } from '../models/address.model';

export interface IAddressRepository {
  findById(id: string): Promise<AddressModel>;
}
