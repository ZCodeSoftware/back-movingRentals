import { VehicleOwnerModel } from "../models/vehicleowner.model";
import { ICreateVehicleOwner, IUpdateVehicleOwner } from "../types/vehicleowner.type";

export interface IVehicleOwnerService {
    create(vehicleowner: ICreateVehicleOwner): Promise<VehicleOwnerModel>;
    findById(id: string): Promise<VehicleOwnerModel>;
    findAll(): Promise<VehicleOwnerModel[]>;
    update(id: string, vehicleowner: IUpdateVehicleOwner): Promise<VehicleOwnerModel>
}
