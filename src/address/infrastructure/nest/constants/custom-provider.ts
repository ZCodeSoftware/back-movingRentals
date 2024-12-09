import { AddressService } from '../../../application/services/address.service';
import SymbolsAddress from '../../../symbols-address';
import { AddressRepository } from '../../mongo/repositories/address.repository';

export const addressService = {
  provide: SymbolsAddress.IAddressService,
  useClass: AddressService,
};

export const addressRepository = {
  provide: SymbolsAddress.IAddressRepository,
  useClass: AddressRepository,
};
