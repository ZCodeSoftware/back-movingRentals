import { VehicleOwnerModel } from "../models/vehicleowner.model";

export interface IVehicleOwnerRepository {
    findById(id: string): Promise<VehicleOwnerModel>;
}
