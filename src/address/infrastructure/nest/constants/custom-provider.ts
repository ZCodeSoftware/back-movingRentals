import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { AddressService } from '../../../application/services/address.service';
import SymbolsAddress from '../../../symbols-address';
import { AddressRepository } from '../../mongo/repositories/address.repository';
import { CatCountryRepository } from '../../mongo/repositories/cat-country.repository';

export const addressService = {
  provide: SymbolsAddress.IAddressService,
  useClass: AddressService,
};

export const addressRepository = {
  provide: SymbolsAddress.IAddressRepository,
  useClass: AddressRepository,
};

export const countryRepository = {
  provide: SymbolsCatalogs.ICatCountryRepository,
  useClass: CatCountryRepository,
};
