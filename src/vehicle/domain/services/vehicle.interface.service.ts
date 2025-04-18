import { VehicleModel } from "../models/vehicle.model";
import { ICreateVehicle, IUpdatePriceByModel, IUpdateVehicle } from "../types/vehicle.type";

export interface IVehicleService {
    create(vehicle: ICreateVehicle): Promise<VehicleModel>;
    findById(id: string): Promise<VehicleModel>;
    findByDate(query: any): Promise<VehicleModel[]>;
    findAll(): Promise<VehicleModel[]>;
    update(id: string, vehicle: IUpdateVehicle): Promise<VehicleModel>
    updateByModel(model: string, prices: IUpdatePriceByModel): Promise<void>
}
