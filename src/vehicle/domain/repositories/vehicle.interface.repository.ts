import { VehicleModel } from "../models/vehicle.model";

export interface IVehicleRepository {
    create(vehicle: VehicleModel): Promise<VehicleModel>;
    findById(id: string): Promise<VehicleModel>;
    findAll(): Promise<VehicleModel[]>;
}
