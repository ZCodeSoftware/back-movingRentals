import { Inject, Injectable } from "@nestjs/common";
import { AddressModel } from "../../domain/models/address.model";
import { IAddressRepository } from "../../domain/repositories/address.interface.repository";
import { IAddressService } from "../../domain/services/address.interface.service";
import { ICreateAddress } from "../../domain/types/address.type";
import SymbolsAddress from "../../symbols-address";

@Injectable()
export class AddressService implements IAddressService {
    constructor(
        @Inject(SymbolsAddress.IAddressRepository)
        private readonly addressRepository: IAddressRepository
    ) { }

    async create(address: ICreateAddress): Promise<AddressModel> {
        const addressModel = AddressModel.create(address);
        return this.addressRepository.create(addressModel);
    }

    async findById(id: string): Promise<AddressModel> {
        return this.addressRepository.findById(id);
    }

    async findAll(): Promise<AddressModel[]> {
        return this.addressRepository.findAll();
    }
}
