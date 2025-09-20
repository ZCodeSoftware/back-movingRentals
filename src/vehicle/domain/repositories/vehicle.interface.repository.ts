import { UpdatePriceByModelDTO } from "../../infrastructure/nest/dtos/vehicle.dto";
import { VehicleModel } from "../models/vehicle.model";

export interface IVehicleRepository {
    create(vehicle: VehicleModel): Promise<VehicleModel>;
    findById(id: string): Promise<VehicleModel>;
    findByDate(query: any): Promise<VehicleModel[]>;
    findAll(filters: any): Promise<VehicleModel[]>;
    update(id: string, vehicle: VehicleModel): Promise<VehicleModel>;
    updatePriceByModel(model: string, prices: UpdatePriceByModelDTO): Promise<void>;
    updateReservation(vehicleId: string, originalEndDate: Date, newEndDate: Date): Promise<void>;
    softDelete(id: string): Promise<void>;
}
