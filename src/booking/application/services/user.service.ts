import { Inject } from '@nestjs/common/decorators/core';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import SymbolsUser from '../../../user/symbols-user';
import { UserModel } from '../../domain/models/user.model';
import { IBookingRepository } from '../../domain/repositories/booking.interface.repository';
import { IUserRepository } from '../../domain/repositories/user.interface.repository';
import { IUserService } from '../../domain/services/user.interface.service';
import { IUserBooking } from '../../domain/types/user.type';
import SymbolsBooking from '../../symbols-booking';

export class UserService implements IUserService {
  constructor(
    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(SymbolsBooking.IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async addBookingInUser(
    userId: string,
    data: IUserBooking,
  ): Promise<UserModel> {
    try {
      const { bookings } = data;
      const existingUser = await this.userRepository.findById(userId);

      if (bookings.length) {
        for (const booking of bookings) {
          const existingBooking =
            await this.bookingRepository.findById(booking);

          existingUser.addBooking(existingBooking);
        }
      }

      return this.userRepository.addBookingInUser(userId, existingUser);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
