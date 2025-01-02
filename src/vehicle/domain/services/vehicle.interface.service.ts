import { VehicleModel } from "../models/vehicle.model";
import { ICreateVehicle, IUpdateVehicle } from "../types/vehicle.type";

export interface IVehicleService {
    create(vehicle: ICreateVehicle): Promise<VehicleModel>;
    findById(id: string): Promise<VehicleModel>;
    findAll(): Promise<VehicleModel[]>;
    update(id: string, vehicle: IUpdateVehicle): Promise<VehicleModel>
}
