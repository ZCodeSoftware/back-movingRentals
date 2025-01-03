import { Inject, Injectable } from '@nestjs/common';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import { AddressModel } from '../../domain/models/address.model';
import { IAddressRepository } from '../../domain/repositories/address.interface.repository';
import { ICatCountryRepository } from '../../domain/repositories/cat-country.interface.repository';
import { IAddressService } from '../../domain/services/address.interface.service';
import { ICreateAddress } from '../../domain/types/address.type';
import SymbolsAddress from '../../symbols-address';

@Injectable()
export class AddressService implements IAddressService {
  constructor(
    @Inject(SymbolsAddress.IAddressRepository)
    private readonly addressRepository: IAddressRepository,
    @Inject(SymbolsCatalogs.ICatCountryRepository)
    private readonly catCountryRepository: ICatCountryRepository,
  ) {}

  async create(address: ICreateAddress): Promise<AddressModel> {
    const addressModel = AddressModel.create(address);

    const findCountry = await this.catCountryRepository.findById(
      address.countryId,
    );

    addressModel.addCountry(findCountry);

    return this.addressRepository.create(addressModel);
  }

  async findById(id: string): Promise<AddressModel> {
    return this.addressRepository.findById(id);
  }

  async findAll(): Promise<AddressModel[]> {
    return this.addressRepository.findAll();
  }
}
