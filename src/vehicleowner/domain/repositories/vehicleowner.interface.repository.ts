import { VehicleOwnerModel } from "../models/vehicleowner.model";

export interface IVehicleOwnerRepository {
    create(vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel>;
    findById(id: string): Promise<VehicleOwnerModel>;
    findAll(): Promise<VehicleOwnerModel[]>;
}
