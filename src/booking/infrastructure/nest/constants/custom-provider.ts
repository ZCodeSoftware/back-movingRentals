import SymbolsBranches from '../../../../branches/symbols-branches';
import { BranchesRepository } from '../../../../branches/infrastructure/mongo/repositories/branches.repository';
import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { CartService } from '../../../../cart/application/services/cart.service';
import { CartRepository } from '../../../../cart/infrastructure/mongo/repositories/cart.repository';
import SymbolsCart from '../../../../cart/symbols-cart';
import SymbolsTicket from '../../../../ticket/symbols-ticket';
import { TicketRepository } from '../../../../ticket/infrastructure/mongo/repositories/ticket.repository';
import SymbolsTour from '../../../../tour/symbols-tour';
import { TourRepository } from '../../../../tour/infrastructure/mongo/repositories/tour.repository';
import SymbolsTransfer from '../../../../transfer/symbols-transfer';
import { TransferRepository } from '../../../../transfer/infrastructure/mongo/repositories/transfer.repository';
import SymbolsUser from '../../../../user/symbols-user';
import SymbolsVehicle from '../../../../vehicle/symbols-vehicle';
import { VehicleRepository } from '../../../../vehicle/infrastructure/mongo/repositories/vehicle.repository';
import SymbolsVehicleOwner from '../../../../vehicleowner/symbols-vehicleowner';
import { VehicleOwnerRepository } from '../../../../vehicleowner/infrastructure/mongo/repositories/vehicleowner.repository';
import { BookingService } from '../../../application/services/booking.service';
import { UserService } from '../../../application/services/user.service';
import SymbolsBooking from '../../../symbols-booking';
import { BookingRepository } from '../../mongo/repositories/booking.repository';
import { CatPaymentMethodRepository } from '../../mongo/repositories/cat-payment-method.repository';
import { CatStatusRepository } from '../../mongo/repositories/cat-status.repository';
import { UserRepository } from '../../../../cart/infrastructure/mongo/repositories/user.repository';

export const bookingService = {
  provide: SymbolsBooking.IBookingService,
  useClass: BookingService,
};

export const bookingRepository = {
  provide: SymbolsBooking.IBookingRepository,
  useClass: BookingRepository,
};

export const catPaymentMethodRepository = {
  provide: SymbolsCatalogs.ICatPaymentMethodRepository,
  useClass: CatPaymentMethodRepository,
};

export const userService = {
  provide: SymbolsUser.IUserService,
  useClass: UserService,
};

export const userRepository = {
  provide: SymbolsUser.IUserRepository,
  useClass: UserRepository,
};

export const catStatusRepository = {
  provide: SymbolsCatalogs.ICatStatusRepository,
  useClass: CatStatusRepository,
}

export const cartService = {
  provide: SymbolsCart.ICartService,
  useClass: CartService,
};

export const cartRepository = {
  provide: SymbolsCart.ICartRepository,
  useClass: CartRepository,
};

export const branchesRepository = {
  provide: SymbolsBranches.IBranchesRepository,
  useClass: BranchesRepository,
};

export const tourRepository = {
  provide: SymbolsTour.ITourRepository,
  useClass: TourRepository,
};

export const vehicleRepository = {
  provide: SymbolsVehicle.IVehicleRepository,
  useClass: VehicleRepository,
};

export const transferRepository = {
  provide: SymbolsTransfer.ITransferRepository,
  useClass: TransferRepository,
};

export const ticketRepository = {
  provide: SymbolsTicket.ITicketRepository,
  useClass: TicketRepository,
};

export const vehicleOwnerRepository = {
  provide: SymbolsVehicleOwner.IVehicleOwnerRepository,
  useClass: VehicleOwnerRepository,
};