import { Inject, Injectable } from "@nestjs/common";
import { VehicleOwnerModel } from "../../domain/models/vehicleowner.model";
import { IVehicleOwnerRepository } from "../../domain/repositories/vehicleowner.interface.repository";
import { IVehicleOwnerService } from "../../domain/services/vehicleowner.interface.service";
import { ICreateVehicleOwner, IUpdateVehicleOwner, IVehicleOwnerFilters } from "../../domain/types/vehicleowner.type";
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

    async findAll(filters?: IVehicleOwnerFilters): Promise<{ data: VehicleOwnerModel[], total: number, page: number, limit: number }> {
        const result = await this.vehicleownerRepository.findAll(filters);
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        
        return {
            data: result.data,
            total: result.total,
            page,
            limit
        };
    }

    async findAllConcierges(): Promise<VehicleOwnerModel[]> {
        return this.vehicleownerRepository.findAllConcierges();
    }

    async findAllOwners(): Promise<VehicleOwnerModel[]> {
        return this.vehicleownerRepository.findAllOwners();
    }

    async findAllOwnersSimple(): Promise<Array<{ _id: string; name: string }>> {
        return this.vehicleownerRepository.findAllOwnersSimple();
    }

    async findAllOwnersWithVehicles(): Promise<VehicleOwnerModel[]> {
        return this.vehicleownerRepository.findAllOwnersWithVehicles();
    }

    async update(id: string, vehicleowner: IUpdateVehicleOwner): Promise<VehicleOwnerModel> {
        const vehicleownerModel = VehicleOwnerModel.create(vehicleowner);
        return this.vehicleownerRepository.update(id, vehicleownerModel);
    }

    async softDelete(id: string): Promise<VehicleOwnerModel> {
        return this.vehicleownerRepository.softDelete(id);
    }
}
