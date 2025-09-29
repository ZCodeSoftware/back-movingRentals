import { VehicleOwnerModel } from "../models/vehicleowner.model";
import { IVehicleOwnerFilters } from "../types/vehicleowner.type";

export interface IVehicleOwnerRepository {
    create(vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel>;
    findById(id: string): Promise<VehicleOwnerModel>;
    findAll(filters?: IVehicleOwnerFilters): Promise<{ data: VehicleOwnerModel[], total: number }>;
    findAllConcierges(): Promise<VehicleOwnerModel[]>;
    findAllOwners(): Promise<VehicleOwnerModel[]>;
    update(id: string, vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel>
}
