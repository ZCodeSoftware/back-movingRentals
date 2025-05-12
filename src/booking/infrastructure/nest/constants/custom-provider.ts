import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import SymbolsUser from '../../../../user/symbols-user';
import { BookingService } from '../../../application/services/booking.service';
import { UserService } from '../../../application/services/user.service';
import SymbolsBooking from '../../../symbols-booking';
import { BookingRepository } from '../../mongo/repositories/booking.repository';
import { CatPaymentMethodRepository } from '../../mongo/repositories/cat-payment-method.repository';
import { CatStatusRepository } from '../../mongo/repositories/cat-status.repository';
import { UserRepository } from '../../mongo/repositories/user.repository';

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