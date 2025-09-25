import { CommissionService } from '../../../application/services/commission.service';
import SymbolsCommission from '../../../symbols-commission';
import { CommissionRepository } from '../../mongo/repositories/commission.repository';
import SymbolsUser from '../../../../user/symbols-user';
import SymbolsVehicle from '../../../../vehicle/symbols-vehicle';
import SymbolsVehicleOwner from '../../../../vehicleowner/symbols-vehicleowner';
import { UserRepository } from '../../../../cart/infrastructure/mongo/repositories/user.repository';
import { VehicleRepository } from '../../../../vehicle/infrastructure/mongo/repositories/vehicle.repository';
import { VehicleOwnerRepository } from '../../../../vehicle/infrastructure/mongo/repositories/vehicleowner.repository';

export const commissionService = {
  provide: SymbolsCommission.ICommissionService,
  useClass: CommissionService,
};

export const commissionRepository = {
  provide: SymbolsCommission.ICommissionRepository,
  useClass: CommissionRepository,
};

export const userRepository = {
  provide: SymbolsUser.IUserRepository,
  useClass: UserRepository,
};

export const vehicleRepository = {
  provide: SymbolsVehicle.IVehicleRepository,
  useClass: VehicleRepository,
};

export const vehicleOwnerRepository = {
  provide: SymbolsVehicleOwner.IVehicleOwnerRepository,
  useClass: VehicleOwnerRepository,
};
