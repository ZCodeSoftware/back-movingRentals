import { VehicleModel } from "../models/vehicle.model";
import { ICreateVehicle } from "../types/vehicle.type";

export interface IVehicleService {
    create(vehicle: ICreateVehicle): Promise<VehicleModel>;
    findById(id: string): Promise<VehicleModel>;
    findAll(): Promise<VehicleModel[]>;
}
