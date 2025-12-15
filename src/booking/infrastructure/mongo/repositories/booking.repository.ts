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
  ) {}

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

    const parsedCart = JSON.parse(booking.toJSON().cart);

    if (parsedCart?.vehicles?.length > 0) {
      for (const vehicleBooking of parsedCart.vehicles) {
        if (vehicleBooking.dates?.start && vehicleBooking.dates?.end) {
          const vehicle = await this.vehicleDB.findById(
            vehicleBooking.vehicle._id,
          );

          if (vehicle) {
            const newReservation = {
              start: new Date(vehicleBooking.dates.start),
              end: new Date(vehicleBooking.dates.end),
              bookingId: newBooking._id.toString(), // Agregar el ID del booking para identificar la reserva
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

    // Populate paymentMethod and status before returning
    const populatedBooking = await this.bookingDB
      .findById(newBooking._id)
      .populate('paymentMethod status')
      .exec();

    return BookingModel.hydrate(populatedBooking);
  }

  async findById(id: string): Promise<BookingModel> {
    const booking = await this.bookingDB.findById(id).populate('paymentMethod status');

    if (!booking)
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);

    return BookingModel.hydrate(booking);
  }

  async findAll(filters: any): Promise<any> {
    const {
      status,
      paymentMethod,
      userId,
      startDate,
      endDate,
      reservationStartDate,
      reservationEndDate,
      isReserve,
      page = 1,
      limit = 10,
    } = filters;

    let query: any = {};

    if (status) query.status = new Types.ObjectId(String(status));
    if (paymentMethod)
      query.paymentMethod = new Types.ObjectId(String(paymentMethod));
    if (isReserve !== undefined) {
      query.isReserve = isReserve === 'true' || isReserve === true;
    }

    if (userId) {
      const user = await this.userDB.findById(userId).select('bookings').lean();

      const userBookingIds = user ? user.bookings : [];

      query._id = { $in: userBookingIds };
    }

    // Filtro por fecha de CREACIÓN del booking
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

    // Filtro por fecha de RESERVA (fechas de inicio de los servicios en el cart)
    // Este filtro busca bookings que tengan al menos un servicio que INICIE en el rango especificado
    if (reservationStartDate || reservationEndDate) {
      // El frontend envía fechas en formato YYYY-MM-DD (ej: 2025-12-07)
      // Necesitamos comparar solo las fechas (día) sin considerar las horas
      
      // Función para extraer solo la fecha (YYYY-MM-DD) de un Date object en zona horaria de México
      const getDateOnly = (date: Date): string => {
        // Convertir a zona horaria de México (America/Cancun = UTC-5)
        const mexicoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Cancun' }));
        const year = mexicoDate.getFullYear();
        const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
        const day = String(mexicoDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Fechas del rango de filtro (solo día)
      const filterStartDate = reservationStartDate || '1970-01-01';
      const filterEndDate = reservationEndDate || '2100-12-31';

      console.log(`[BookingRepository] Filtrando por fecha de INICIO de reserva: ${filterStartDate} - ${filterEndDate}`);

      // Obtener todos los bookings que cumplan con los otros filtros
      const allBookings = await this.bookingDB.find(query).select('_id cart').lean();
      const matchingIds: Types.ObjectId[] = [];

      console.log(`[BookingRepository] Analizando ${allBookings.length} bookings...`);

      for (const booking of allBookings) {
        try {
          const cart = JSON.parse(booking.cart || '{}');
          let hasMatch = false;

          // Verificar vehículos - solo verificar fecha de INICIO
          if (cart.vehicles && Array.isArray(cart.vehicles)) {
            for (const vehicle of cart.vehicles) {
              if (vehicle.dates?.start) {
                const vehicleStart = new Date(vehicle.dates.start);
                const vehicleStartDate = getDateOnly(vehicleStart);
                
                // Verificar si la fecha de inicio está dentro del rango (comparación de strings YYYY-MM-DD)
                if (vehicleStartDate >= filterStartDate && vehicleStartDate <= filterEndDate) {
                  hasMatch = true;
                  console.log(`[BookingRepository] Match encontrado en vehículo (inicio): ${vehicleStartDate}`);
                  break;
                }
              }
            }
          }

          // Verificar transfers - verificar fecha del servicio
          if (!hasMatch && cart.transfer && Array.isArray(cart.transfer)) {
            for (const transfer of cart.transfer) {
              if (transfer.date) {
                const transferDate = new Date(transfer.date);
                const transferDateOnly = getDateOnly(transferDate);
                if (transferDateOnly >= filterStartDate && transferDateOnly <= filterEndDate) {
                  hasMatch = true;
                  console.log(`[BookingRepository] Match encontrado en transfer: ${transferDateOnly}`);
                  break;
                }
              }
            }
          }

          // Verificar tours - verificar fecha del servicio
          if (!hasMatch && cart.tours && Array.isArray(cart.tours)) {
            for (const tour of cart.tours) {
              if (tour.date) {
                const tourDate = new Date(tour.date);
                const tourDateOnly = getDateOnly(tourDate);
                if (tourDateOnly >= filterStartDate && tourDateOnly <= filterEndDate) {
                  hasMatch = true;
                  console.log(`[BookingRepository] Match encontrado en tour: ${tourDateOnly}`);
                  break;
                }
              }
            }
          }

          // Verificar tickets - verificar fecha del servicio
          if (!hasMatch && cart.tickets && Array.isArray(cart.tickets)) {
            for (const ticket of cart.tickets) {
              if (ticket.date) {
                const ticketDate = new Date(ticket.date);
                const ticketDateOnly = getDateOnly(ticketDate);
                if (ticketDateOnly >= filterStartDate && ticketDateOnly <= filterEndDate) {
                  hasMatch = true;
                  console.log(`[BookingRepository] Match encontrado en ticket: ${ticketDateOnly}`);
                  break;
                }
              }
            }
          }

          if (hasMatch) {
            matchingIds.push(booking._id);
          }
        } catch (error) {
          console.error(`[BookingRepository] Error parsing cart for booking ${booking._id}:`, error);
        }
      }

      console.log(`[BookingRepository] ${matchingIds.length} bookings coinciden con el filtro de fecha de inicio de reserva`);

      // Reemplazar el query con solo los IDs que coinciden
      query = { _id: { $in: matchingIds } };
      
      // Mantener otros filtros si existen
      if (status) query.status = new Types.ObjectId(String(status));
      if (paymentMethod) query.paymentMethod = new Types.ObjectId(String(paymentMethod));
      if (isReserve !== undefined) query.isReserve = isReserve === 'true' || isReserve === true;
    }

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const totalItemsResult = await this.bookingDB.aggregate([
      { $match: query },
      { $count: 'totalItems' },
    ]);
    const totalItems =
      totalItemsResult.length > 0 ? totalItemsResult[0].totalItems : 0;

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
          as: 'statusData',
        },
      },
      {
        $lookup: {
          from: 'cat_payment_method',
          localField: 'paymentMethod',
          foreignField: '_id',
          as: 'paymentMethodData',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { bookingId: '$_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$$bookingId', '$bookings'] } } },
            { $project: { name: 1, lastName: 1, email: 1, cellphone: 1 } },
          ],
          as: 'userData',
        },
      },
      {
        $lookup: {
          from: 'contracts',
          localField: '_id',
          foreignField: 'booking',
          as: 'contractData',
        },
      },
      {
        $lookup: {
          from: 'vehicle_owners',
          localField: 'concierge',
          foreignField: '_id',
          as: 'conciergeData',
        },
      },
      {
        $unwind: { path: '$statusData', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: '$conciergeData', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: {
          path: '$paymentMethodData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: { path: '$userData', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: '$contractData', preserveNullAndEmptyArrays: true },
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
          isReserve: 1,
          metadata: 1,
          concierge: 1,
          paymentMedium: 1,
          conciergeName: { $ifNull: ['$conciergeData.name', null] },
          status: '$statusData',
          paymentMethod: '$paymentMethodData',
          userContact: {
            $cond: {
              if: '$userData',
              then: {
                name: '$userData.name',
                lastName: '$userData.lastName',
                email: '$userData.email',
                cellphone: { $ifNull: ['$userData.cellphone', null] },
              },
              else: null,
            },
          },
          hasExtension: {
            $toBool: '$contractData.extension',
          },
          contract: {
            $cond: {
              if: '$contractData',
              then: {
                _id: '$contractData._id',
                statusId: '$contractData.status',
                reservingUser: '$contractData.reservingUser',
                createdByUser: '$contractData.createdByUser',
                extension: { $ifNull: ['$contractData.extension', null] },
              },
              else: null,
            },
          },
        },
      },
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
      .populate('status')
      .populate('paymentMethod')
      .sort({ createdAt: -1 })
      .exec();

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
      throw new BaseErrorException(
        'User not found for this booking',
        HttpStatus.NOT_FOUND,
      );
    }

    return user && UserModel.hydrate(user);
  }

  async update(id: string, booking: BookingModel): Promise<BookingModel> {
    const updateObject = booking.toJSON();
    
    console.log(`[BookingRepository] update - updateObject.isReserve: ${updateObject.isReserve}, totalPaid: ${updateObject.totalPaid}`);

    const filteredUpdateObject = Object.fromEntries(
      Object.entries(updateObject).filter(([key, value]) => {
        if (BOOKING_RELATIONS.includes(key)) {
          return (
            value !== null &&
            value !== undefined &&
            typeof value === 'object' &&
            '_id' in value
          );
        }
        return value !== null && value !== undefined;
      }),
    );
    
    console.log(`[BookingRepository] update - filteredUpdateObject.isReserve: ${filteredUpdateObject.isReserve}, totalPaid: ${filteredUpdateObject.totalPaid}`);

    // Extraer solo los IDs de las relaciones para la actualización
    const updateData = { ...filteredUpdateObject };
    BOOKING_RELATIONS.forEach(relation => {
      if (updateData[relation] && typeof updateData[relation] === 'object' && '_id' in updateData[relation]) {
        updateData[relation] = updateData[relation]._id;
      }
    });
    
    console.log(`[BookingRepository] update - updateData.isReserve: ${updateData.isReserve}, totalPaid: ${updateData.totalPaid}`);

    const updatedBooking = await this.bookingDB
      .findByIdAndUpdate(id, updateData, {
        new: true,
        omitUndefined: true,
      })
      .populate('paymentMethod status');

    if (!updatedBooking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }

    return BookingModel.hydrate(updatedBooking);
  }

  async removeFields(id: string, fields: string[]): Promise<void> {
    console.log(`[BookingRepository.removeFields] Removing fields ${fields.join(', ')} from booking ${id}`);
    const unsetFields: any = {};
    fields.forEach(field => {
      unsetFields[field] = '';
    });
    
    console.log(`[BookingRepository.removeFields] Unset object:`, unsetFields);
    const result = await this.bookingDB.findByIdAndUpdate(id, { $unset: unsetFields });
    
    if (result) {
      console.log(`[BookingRepository.removeFields] Successfully updated booking ${id}`);
    } else {
      console.log(`[BookingRepository.removeFields] Booking ${id} not found or not updated`);
    }
  }
}
