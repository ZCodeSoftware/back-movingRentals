import SymbolsBranches from '../../../../branches/symbols-branches';
import SymbolsTicket from '../../../../ticket/symbols-ticket';
import SymbolsTour from '../../../../tour/symbols-tour';
import SymbolsTransfer from '../../../../transfer/symbols-transfer';
import SymbolsVehicle from '../../../../vehicle/symbols-vehicle';
import { CartService } from '../../../application/services/cart.service';
import SymbolsCart from '../../../symbols-cart';
import { BranchesRepository } from '../../mongo/repositories/branches.repository';
import { CartRepository } from '../../mongo/repositories/cart.repository';
import { TicketRepository } from '../../mongo/repositories/ticket.repository';
import { TourRepository } from '../../mongo/repositories/tour.repository';
import { TransferRepository } from '../../mongo/repositories/transfer.repository';
import { VehicleRepository } from '../../mongo/repositories/vehicle.repository';

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
}