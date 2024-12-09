import { VehicleModel } from '../models/vehicle.model';

export interface IVehicleRepository {
  findById(id: string): Promise<VehicleModel>;
}
