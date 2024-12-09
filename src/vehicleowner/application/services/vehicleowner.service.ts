import { Inject, Injectable } from "@nestjs/common";
import { VehicleOwnerModel } from "../../domain/models/vehicleowner.model";
import { IVehicleOwnerRepository } from "../../domain/repositories/vehicleowner.interface.repository";
import { IVehicleOwnerService } from "../../domain/services/vehicleowner.interface.service";
import { ICreateVehicleOwner } from "../../domain/types/vehicleowner.type";
import SymbolsVehicleOwner from "../../symbols-vehicleowner";

@Injectable()
export class VehicleOwnerService implements IVehicleOwnerService {
    constructor(
        @Inject(SymbolsVehicleOwner.IVehicleOwnerRepository)
        private readonly vehicleownerRepository: IVehicleOwnerRepository
    ) { }

    async create(vehicleowner: ICreateVehicleOwner): Promise<VehicleOwnerModel> {
        const vehicleownerModel = VehicleOwnerModel.create(vehicleowner);
        return this.vehicleownerRepository.create(vehicleownerModel);
    }

    async findById(id: string): Promise<VehicleOwnerModel> {
        return this.vehicleownerRepository.findById(id);
    }

    async findAll(): Promise<VehicleOwnerModel[]> {
        return this.vehicleownerRepository.findAll();
    }
}
