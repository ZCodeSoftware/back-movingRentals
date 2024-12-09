import { VehicleOwnerService } from '../../../application/services/vehicleowner.service';
import SymbolsVehicleOwner from '../../../symbols-vehicleowner';
import { VehicleOwnerRepository } from '../../mongo/repositories/vehicleowner.repository';

export const vehicleOwnerService = {
  provide: SymbolsVehicleOwner.IVehicleOwnerService,
  useClass: VehicleOwnerService,
};

export const vehicleOwnerRepository = {
  provide: SymbolsVehicleOwner.IVehicleOwnerRepository,
  useClass: VehicleOwnerRepository,
};
