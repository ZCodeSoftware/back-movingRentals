import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import SymbolsVehicleOwner from '../../../../vehicleowner/symbols-vehicleowner';
import { VehicleService } from '../../../application/services/vehicle.service';
import SymbolsVehicle from '../../../symbols-vehicle';
import { CatCategoryRepository } from '../../mongo/repositories/cat-category.repository';
import { VehicleRepository } from '../../mongo/repositories/vehicle.repository';
import { VehicleOwnerRepository } from '../../mongo/repositories/vehicleowner.repository';

export const vehicleService = {
  provide: SymbolsVehicle.IVehicleService,
  useClass: VehicleService,
};

export const vehicleRepository = {
  provide: SymbolsVehicle.IVehicleRepository,
  useClass: VehicleRepository,
};

export const catCategoryRepository = {
  provide: SymbolsCatalogs.ICatCategoryRepository,
  useClass: CatCategoryRepository,
}

export const vehicleOwnerRepository = {
  provide: SymbolsVehicleOwner.IVehicleOwnerRepository,
  useClass: VehicleOwnerRepository,
}