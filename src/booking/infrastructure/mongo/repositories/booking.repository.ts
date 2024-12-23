import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { BookingModel } from '../../../domain/models/booking.model';
import { IBookingRepository } from '../../../domain/repositories/booking.interface.repository';
import { BookingSchema } from '../schemas/booking.schema';
import { UserSchema } from '../schemas/user.schema';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectModel('Booking') private readonly bookingDB: Model<BookingSchema>,
    @InjectModel('User') private readonly userDB: Model<UserSchema>,
  ) { }

  async create(booking: BookingModel, id: string): Promise<BookingModel> {
    const schema = new this.bookingDB(booking.toJSON());
    const newBooking = await schema.save();

    if (!newBooking)
      throw new BaseErrorException(
        `Booking shouldn't be created`,
        HttpStatus.BAD_REQUEST,
      );
    const user = await this.userDB.findById(id);
    if (!user) {
      throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);
    }

    user.bookings.push(newBooking);
    await user.save();

    return BookingModel.hydrate(newBooking);
  }

  async findById(id: string): Promise<BookingModel> {
    const booking = await this.bookingDB.findById(id).populate('paymentMethod');

    if (!booking)
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);

    return BookingModel.hydrate(booking);
  }

  async findAll(): Promise<BookingModel[]> {
    const bookings = await this.bookingDB.find().populate('paymentMethod');

    return bookings?.map((booking) => BookingModel.hydrate(booking));
  }

  async findByUserId(userId: string): Promise<BookingModel[]> {
    const user = await this.userDB.findById(userId).populate({
      path: 'bookings',
      populate: {
        path: 'paymentMethod',
        model: 'CatPaymentMethod',
      }
    });

    if (!user)
      throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);

    return user.bookings?.map((booking) => BookingModel.hydrate(booking));
  }
}
