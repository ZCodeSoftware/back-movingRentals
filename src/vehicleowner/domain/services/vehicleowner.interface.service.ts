import { VehicleOwnerModel } from "../models/vehicleowner.model";
import { ICreateVehicleOwner, IUpdateVehicleOwner, IVehicleOwnerFilters } from "../types/vehicleowner.type";

export interface IVehicleOwnerService {
    create(vehicleowner: ICreateVehicleOwner): Promise<VehicleOwnerModel>;
    findById(id: string): Promise<VehicleOwnerModel>;
    findAll(filters?: IVehicleOwnerFilters): Promise<{ data: VehicleOwnerModel[], total: number, page: number, limit: number }>;
    findAllConcierges(): Promise<VehicleOwnerModel[]>;
    findAllOwners(): Promise<VehicleOwnerModel[]>;
    update(id: string, vehicleowner: IUpdateVehicleOwner): Promise<VehicleOwnerModel>
}
