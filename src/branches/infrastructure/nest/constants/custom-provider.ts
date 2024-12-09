import SymbolsAddress from '../../../../address/symbols-address';
import SymbolsTour from '../../../../tour/symbols-tour';
import SymbolsUser from '../../../../user/symbols-user';
import SymbolsVehicle from '../../../../vehicle/symbols-vehicle';
import { BranchesService } from '../../../application/services/branches.service';
import SymbolsBranches from '../../../symbols-branches';
import { AddressRepository } from '../../mongo/repositories/address.repository';
import { BranchesRepository } from '../../mongo/repositories/branches.repository';
import { TourRepository } from '../../mongo/repositories/tour.repository';
import { UserRepository } from '../../mongo/repositories/user.repository';
import { VehicleRepository } from '../../mongo/repositories/vehicle.repository';

export const branchesService = {
  provide: SymbolsBranches.IBranchesService,
  useClass: BranchesService,
};

export const branchesRepository = {
  provide: SymbolsBranches.IBranchesRepository,
  useClass: BranchesRepository,
};

export const addressRepository = {
  provide: SymbolsAddress.IAddressRepository,
  useClass: AddressRepository,
};

export const vehicleRepository = {
  provide: SymbolsVehicle.IVehicleRepository,
  useClass: VehicleRepository,
};

export const tourRepository = {
  provide: SymbolsTour.ITourRepository,
  useClass: TourRepository,
};

export const userRepository = {
  provide: SymbolsUser.IUserRepository,
  useClass: UserRepository,
};
