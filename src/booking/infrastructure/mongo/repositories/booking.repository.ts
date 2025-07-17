import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TypeStatus } from '../../../../core/domain/enums/type-status.enum';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { BOOKING_RELATIONS } from '../../../../core/infrastructure/nest/constants/relations.constant';
import { BookingModel } from '../../../domain/models/booking.model';
import { UserModel } from '../../../domain/models/user.model';
import { IBookingRepository, IPaginatedBookingResponse } from '../../../domain/repositories/booking.interface.repository';
import { BookingSchema } from '../schemas/booking.schema';
import { UserSchema } from '../schemas/user.schema';
import { VehicleSchema } from '../schemas/vehicle.schema';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectModel('Booking') private readonly bookingDB: Model<BookingSchema>,
    @InjectModel('User') private readonly userDB: Model<UserSchema>,
    @InjectModel('Vehicle') private readonly vehicleDB: Model<VehicleSchema>,
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


    const parsedCart = JSON.parse(booking.toJSON().cart)

    if (parsedCart?.vehicles?.length > 0) {
      for (const vehicleBooking of parsedCart.vehicles) {
        if (vehicleBooking.dates?.start && vehicleBooking.dates?.end) {
          const vehicle = await this.vehicleDB.findById(vehicleBooking.vehicle._id);

          if (vehicle) {
            const newReservation = {
              start: new Date(vehicleBooking.dates.start),
              end: new Date(vehicleBooking.dates.end)
            };

            if (!vehicle.reservations) {
              vehicle.reservations = [];
            }

            vehicle.reservations.push(newReservation);

            await vehicle.save();
          }
        }
      }
    }

    return BookingModel.hydrate(newBooking);
  }

  async findById(id: string): Promise<BookingModel> {
    const booking = await this.bookingDB.findById(id).populate('paymentMethod');

    if (!booking)
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);

    return BookingModel.hydrate(booking);
  }

  async findAll(filters: any): Promise<IPaginatedBookingResponse> {
    const { status, paymentMethod, page = 1, limit = 10, ...otherFilters } = filters;

    const query: any = { ...otherFilters };

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    const skip = (page - 1) * limit;
    const limitNumber = parseInt(limit);

    const totalItems = await this.bookingDB.countDocuments(query);

    const bookings = await this.bookingDB
      .find(query)
      .populate('paymentMethod')
      .populate('status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .exec();

    const totalPages = Math.ceil(totalItems / limitNumber);
    const currentPage = parseInt(page);

    return {
      data: bookings?.map((booking) => BookingModel.hydrate(booking)) || [],
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: limitNumber,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }

  async findByUserId(userId: string): Promise<BookingModel[]> {
    const user = await this.userDB.findById(userId).select('bookings').exec();

    if (!user || !user.bookings.length) {
      return [];
    }

    const bookings = await this.bookingDB
      .find({
        _id: { $in: user.bookings },
      })
      .populate({
        path: 'status',
        match: { name: TypeStatus.APPROVED },
        select: 'name'
      })
      .populate('paymentMethod')
      .exec()
      .then(bookings =>
        bookings.filter(booking => booking.status !== null)
      );

    return bookings.map((booking) => BookingModel.hydrate(booking));
  }

  async findUserByBookingId(bookingId: string): Promise<UserModel | null> {
    // First verify that the booking exists
    const booking = await this.bookingDB.findById(bookingId);

    if (!booking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }

    // Find the user that has this booking in their bookings array
    const user = await this.userDB
      .findOne({ bookings: bookingId })
      .populate('role')
      .populate('company')
      .populate('address')
      .populate('bookings')
      .exec();

    if (!user) {
      throw new BaseErrorException('User not found for this booking', HttpStatus.NOT_FOUND);
    }

    return user && UserModel.hydrate(user);
  }

  async update(id: string, booking: BookingModel): Promise<BookingModel> {
    const updateObject = booking.toJSON();

    const filteredUpdateObject = Object.fromEntries(
      Object.entries(updateObject).filter(([key, value]) => {
        if (BOOKING_RELATIONS.includes(key)) {
          return value !== null && value !== undefined && typeof value === 'object' && '_id' in value;
        }
        return value !== null && value !== undefined;
      })
    );

    const updatedBooking = await this.bookingDB.findByIdAndUpdate(
      id,
      filteredUpdateObject,
      { new: true, omitUndefined: true }
    ).populate('paymentMethod');

    if (!updatedBooking) {
      throw new BaseErrorException(
        'Booking not found',
        HttpStatus.NOT_FOUND
      );
    }

    return BookingModel.hydrate(updatedBooking);
  }
}
