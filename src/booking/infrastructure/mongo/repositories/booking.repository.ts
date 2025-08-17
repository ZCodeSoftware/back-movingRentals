import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TypeStatus } from '../../../../core/domain/enums/type-status.enum';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { BOOKING_RELATIONS } from '../../../../core/infrastructure/nest/constants/relations.constant';
import { BookingModel } from '../../../domain/models/booking.model';
import { UserModel } from '../../../domain/models/user.model';
import { IBookingRepository } from '../../../domain/repositories/booking.interface.repository';
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

  async findAll(filters: any): Promise<any> {
    const { status, paymentMethod, userId, startDate, endDate, page = 1, limit = 10 } = filters;

    const query: any = {};

    if (status) query.status = new Types.ObjectId(String(status));
    if (paymentMethod) query.paymentMethod = new Types.ObjectId(String(paymentMethod));

    if (userId) {
      const user = await this.userDB.findById(userId).select('bookings').lean();

      const userBookingIds = user ? user.bookings : [];

      query._id = { $in: userBookingIds };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const totalItemsResult = await this.bookingDB.aggregate([
      { $match: query },
      { $count: 'totalItems' }
    ]);
    const totalItems = totalItemsResult.length > 0 ? totalItemsResult[0].totalItems : 0;

    const bookings = await this.bookingDB.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $lookup: {
          from: 'cat_status',
          localField: 'status',
          foreignField: '_id',
          as: 'statusData'
        }
      },
      {
        $lookup: {
          from: 'cat_payment_method',
          localField: 'paymentMethod',
          foreignField: '_id',
          as: 'paymentMethodData'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { bookingId: '$_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$$bookingId', '$bookings'] } } },
            { $project: { name: 1, lastName: 1, email: 1, cellphone: 1 } }
          ],
          as: 'userData'
        }
      },
      {
        $lookup: {
          from: 'contracts',
          localField: '_id',
          foreignField: 'booking',
          as: 'contractData'
        }
      },
      {
        $unwind: { path: '$statusData', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$paymentMethodData', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$userData', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$contractData', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          cart: 1,
          limitCancelation: 1,
          total: 1,
          totalPaid: 1,
          bookingNumber: 1,
          status: '$statusData',
          paymentMethod: '$paymentMethodData',
          userContact: {
            $cond: {
              if: '$userData',
              then: {
                name: '$userData.name',
                lastName: '$userData.lastName',
                email: '$userData.email',
                cellphone: { $ifNull: ['$userData.cellphone', null] }
              },
              else: null
            }
          },
          hasExtension: {
            $toBool: "$contractData.extension"
          },
          contract: {
            $cond: {
              if: "$contractData",
              then: {
                _id: "$contractData._id",
                statusId: "$contractData.status",
                reservingUser: "$contractData.reservingUser",
                createdByUser: "$contractData.createdByUser",
                extension: { $ifNull: ["$contractData.extension", null] }
              },
              else: null
            }
          }
        }
      }
    ]);

    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      data: bookings,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
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
