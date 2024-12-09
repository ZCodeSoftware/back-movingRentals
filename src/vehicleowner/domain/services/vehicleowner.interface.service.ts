import { VehicleOwnerModel } from "../models/vehicleowner.model";
import { ICreateVehicleOwner } from "../types/vehicleowner.type";

export interface IVehicleOwnerService {
    create(vehicleowner: ICreateVehicleOwner): Promise<VehicleOwnerModel>;
    findById(id: string): Promise<VehicleOwnerModel>;
    findAll(): Promise<VehicleOwnerModel[]>;
}
