import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICartRepository } from '../../../cart/domain/repositories/cart.interface.repository';
import { IUserRepository } from '../../../cart/domain/repositories/user.interface.repository';
import SymbolsCart from '../../../cart/symbols-cart';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import { CommissionModel } from '../../../commission/domain/models/commission.model';
import { ICommissionRepository } from '../../../commission/domain/repositories/commission.interface.repository';
import SymbolsCommission from '../../../commission/symbols-commission';
import { TypeStatus } from '../../../core/domain/enums/type-status.enum';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import SymbolsUser from '../../../user/symbols-user';
import { IVehicleRepository } from '../../../vehicle/domain/repositories/vehicle.interface.repository';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { BookingModel } from '../../domain/models/booking.model';
import { IBookingRepository } from '../../domain/repositories/booking.interface.repository';
import { ICatPaymentMethodRepository } from '../../domain/repositories/cat-payment-method.interface.repository';
import { ICatStatusRepository } from '../../domain/repositories/cat-status.interface.repostory';
import { IBookingService } from '../../domain/services/booking.interface.service';
import { ICreateBooking } from '../../domain/types/booking.type';
import { CreateBookingDTO } from '../../infrastructure/nest/dtos/booking.dto';
import SymbolsBooking from '../../symbols-booking';

@Injectable()
export class BookingService implements IBookingService {
  constructor(
    @Inject(SymbolsBooking.IBookingRepository)
    private readonly bookingRepository: IBookingRepository,

    @Inject(SymbolsCatalogs.ICatPaymentMethodRepository)
    private readonly paymentMethodRepository: ICatPaymentMethodRepository,

    @Inject(SymbolsCatalogs.ICatStatusRepository)
    private readonly catStatusRepository: ICatStatusRepository,

    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,

    @Inject(SymbolsCart.ICartRepository)
    private readonly cartRepository: ICartRepository,

    @Inject(SymbolsCommission.ICommissionRepository)
    private readonly commissionRepository: ICommissionRepository,

    @Inject(SymbolsVehicle.IVehicleRepository)
    private readonly vehicleRepository: IVehicleRepository,

    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(booking: ICreateBooking, id: string): Promise<BookingModel> {
    const { paymentMethod, ...res } = booking;
    const bookingModel = BookingModel.create(res);

    const catPaymentMethod =
      await this.paymentMethodRepository.findById(paymentMethod);

    if (!catPaymentMethod) {
      throw new BaseErrorException(
        'CatPaymentMethod not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const status = await this.catStatusRepository.getStatusByName(
      TypeStatus.PENDING,
    );

    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    bookingModel.addStatus(status);

    bookingModel.addPaymentMethod(catPaymentMethod);

    const bookingSave = await this.bookingRepository.create(bookingModel, id);

    return bookingSave;
  }

  async addManualBookingInUser(
    booking: ICreateBooking,
    email: string,
  ): Promise<BookingModel> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);
    }

    const id = user.toJSON()._id.toString();

    const bookingModel = BookingModel.create(booking);

    const catPaymentMethod = await this.paymentMethodRepository.findById(
      booking.paymentMethod,
    );

    if (!catPaymentMethod) {
      throw new BaseErrorException(
        'CatPaymentMethod not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const status = await this.catStatusRepository.getStatusByName(
      TypeStatus.PENDING,
    );

    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    bookingModel.addStatus(status);

    bookingModel.addPaymentMethod(catPaymentMethod);

    const bookingSave = await this.bookingRepository.create(bookingModel, id);

    return bookingSave;
  }

  async addManualBookingInUserFromCart(
    email: string,
    body: Partial<CreateBookingDTO>,
    lang: string = 'es',
  ): Promise<BookingModel> {
    // 1. Buscar el usuario por email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);
    }

    const userId = user.toJSON()._id.toString();
    const cartId = user.toJSON().cart;

    // 2. Obtener el carrito del usuario
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new BaseErrorException('Cart not found', HttpStatus.NOT_FOUND);
    }

    const cartData = cart.toJSON();

    const hasItems =
      (cartData.vehicles && cartData.vehicles.length > 0) ||
      (cartData.transfer && cartData.transfer.length > 0) ||
      (cartData.tours && cartData.tours.length > 0) ||
      (cartData.tickets && cartData.tickets.length > 0);

    if (!hasItems) {
      throw new BaseErrorException('Cart is empty', HttpStatus.BAD_REQUEST);
    }

    // 4. Calcular el total del carrito
    let total = 0;

    // Sumar vehículos
    if (cartData.vehicles) {
      total += cartData.vehicles.reduce(
        (sum, item) => sum + (item.total || 0),
        0,
      );
    }

    // Sumar transfers
    if (cartData.transfer) {
      total += cartData.transfer.reduce(
        (sum, item) => sum + (item.transfer.price || 0) * (item.quantity || 1),
        0,
      );
    }

    // Sumar tours
    if (cartData.tours) {
      total += cartData.tours.reduce(
        (sum, item) => sum + (item.tour.price || 0) * (item.quantity || 1),
        0,
      );
    }

    // Sumar tickets
    if (cartData.tickets) {
      total += cartData.tickets.reduce(
        (sum, item) =>
          sum + (item.ticket.totalPrice || 0) * (item.quantity || 1),
        0,
      );
    }

    // 5. Buscar un método de pago por defecto (el primero disponible)
    const paymentMethods = await this.paymentMethodRepository.findById(
      body.paymentMethod,
    );
    if (!paymentMethods) {
      throw new BaseErrorException(
        'No payment methods available',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 6. Crear el booking con los datos del carrito
    const bookingData = {
      cart: JSON.stringify(cartData),
      total: total,
      totalPaid: total,
      isValidated: true,
    };

    const bookingModel = BookingModel.create(bookingData);

    // 7. Agregar status pendiente
    const status = await this.catStatusRepository.getStatusById(body.status);
    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    bookingModel.addStatus(status);
    bookingModel.addPaymentMethod(paymentMethods);

    // 8. Crear el booking
    const bookingSave = await this.bookingRepository.create(
      bookingModel,
      userId,
    );

    this.eventEmitter.emit('send-booking.created', {
      updatedBooking: bookingSave,
      userEmail: email,
      lang,
    });

    // 9. Crear comisiones si la reserva viene aprobada
    const statusName = status.toJSON().name;
    if (statusName === TypeStatus.APPROVED) {
      try {
        const bookingJson = bookingSave.toJSON();
        const bookingId = bookingJson._id?.toString?.() ?? '';
        const bookingNumber = bookingJson.bookingNumber;

        if (cartData?.vehicles && Array.isArray(cartData.vehicles)) {
          const existing = await this.commissionRepository.findByBooking(bookingId);
          if (!existing || existing.length === 0) {
            for (const v of cartData.vehicles) {
              const vehicle = v.vehicle;
              const vehicleId = vehicle?._id?.toString();
              let ownerId = (vehicle as any)?.owner?._id;
              const total = v.total ?? 0;

              // Fallback: fetch vehicle to get owner if not present in cart JSON
              if (!ownerId && vehicleId) {
                try {
                  const fullVehicle = await this.vehicleRepository.findById(vehicleId);
                  ownerId = (((fullVehicle as any)?.toJSON?.() as any)?.owner as any)?._id ?? ownerId;
                } catch { }
              }

              if (ownerId && vehicleId && typeof total === 'number') {
                const percentage = (vehicle as any)?.owner?.commissionPercentage ?? 0;
                const amount = Math.round((total * (percentage / 100)) * 100) / 100;

                await this.commissionRepository.create(
                  CommissionModel.create({
                    booking: bookingId as any,
                    bookingNumber: bookingNumber as any,
                    user: userId as any,
                    vehicleOwner: ownerId as any,
                    vehicle: vehicleId as any,
                    detail: 'Renta',
                    status: 'PENDING',
                    amount: amount as any,
                  } as any)
                );
              }
            }
          }
        }
      } catch (e) {
        // ignore commission errors
      }
    }

    return bookingSave;
  }

  async findById(id: string): Promise<BookingModel> {
    return this.bookingRepository.findById(id);
  }

  async findAll(filters: any): Promise<any> {
    const res = await this.bookingRepository.findAll(filters);
    return res;
  }

  async findByUserId(userId: string): Promise<BookingModel[]> {
    return this.bookingRepository.findByUserId(userId);
  }

  async findUserByBookingId(bookingId: string): Promise<any> {
    return this.bookingRepository.findUserByBookingId(bookingId);
  }

  async update(
    id: string,
    booking: Partial<ICreateBooking>,
  ): Promise<BookingModel> {
    const { paymentMethod, ...res } = booking;
    const bookingModel = BookingModel.create(res);

    const catPaymentMethod =
      await this.paymentMethodRepository.findById(paymentMethod);

    if (catPaymentMethod) bookingModel.addPaymentMethod(catPaymentMethod);

    return this.bookingRepository.update(id, bookingModel);
  }

  async validateBooking(
    id: string,
    paid: boolean,
    email: string,
    lang: string = 'es',
    isManual: boolean = false,
    isValidated: boolean = false,
  ): Promise<BookingModel> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }
    let status;
    if (booking.toJSON().paymentMethod.name === 'Credito/Debito') {
      status = await this.catStatusRepository.getStatusByName(
        paid ? TypeStatus.APPROVED : TypeStatus.REJECTED,
      );
    } else {
      if (booking.toJSON().paymentMethod.name === "Efectivo") {
        status = await this.catStatusRepository.getStatusByName(
          TypeStatus.APPROVED
        );
      } else {
        status = await this.catStatusRepository.getStatusByName(
          TypeStatus.PENDING
        );
      }
    }

    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    booking.addStatus(status);

    booking.payBooking(paid);

    isValidated && booking.validateBooking();

    const updatedBooking = await this.bookingRepository.update(id, booking);

    if (!updatedBooking) {
      throw new BaseErrorException('Booking not updated', HttpStatus.NOT_FOUND);
    }

    if (isManual) {
      const user = await this.bookingRepository.findUserByBookingId(id);
      email = user.toJSON().email || email;
    }

    if (
      (status.toJSON().name === TypeStatus.APPROVED ||
        (booking.toJSON().paymentMethod.name !== 'Mercado Pago' &&
          booking.toJSON().paymentMethod.name !== 'Credito' &&
          booking.toJSON().paymentMethod.name !== 'Debito')) &&
      status.toJSON().name !== TypeStatus.REJECTED
    ) {
      this.eventEmitter.emit('send-booking.created', {
        updatedBooking,
        userEmail: email,
        lang,
      });

      try {
        const parsedCart = JSON.parse(updatedBooking.toJSON().cart || '{}');
        const user = await this.bookingRepository.findUserByBookingId(id);
        const userId = user?.toJSON()._id?.toString?.() ?? undefined;
        const bookingJson = updatedBooking.toJSON();
        const bookingId = bookingJson._id?.toString?.() ?? id;
        const bookingNumber = bookingJson.bookingNumber;

        if (parsedCart?.vehicles && Array.isArray(parsedCart.vehicles)) {
          const existing = await this.commissionRepository.findByBooking(bookingId);
          if (!existing || existing.length === 0) {
            for (const v of parsedCart.vehicles) {
              const vehicle = v.vehicle;
              const vehicleId = vehicle?._id;
              let ownerId = vehicle?.owner?._id;
              const total = v.total ?? 0;

              // Fallback: fetch vehicle to get owner if not present in cart JSON
              if (!ownerId && vehicleId) {
                try {
                  const fullVehicle = await this.vehicleRepository.findById(vehicleId);
                  ownerId = (((fullVehicle as any)?.toJSON?.() as any)?.owner as any)?._id ?? ownerId;
                } catch { }
              }

              if (ownerId && vehicleId && typeof total === 'number') {
                const percentage = vehicle?.owner?.commissionPercentage ?? 0;
                const amount = Math.round((total * (percentage / 100)) * 100) / 100;

                await this.commissionRepository.create(
                  CommissionModel.create({
                    booking: bookingId as any,
                    bookingNumber: bookingNumber as any,
                    user: userId as any,
                    vehicleOwner: ownerId as any,
                    vehicle: vehicleId as any,
                    detail: 'Renta',
                    status: 'PENDING',
                    amount: amount as any,
                  } as any)
                );
              }
            }
          }
        }
      } catch (e) {
        // ignore commission errors
      }
    }

    return updatedBooking;
  }

  async cancelBooking(
    id: string,
    email: string,
    lang: string = 'es',
  ): Promise<BookingModel> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }

    // Verificar que la reserva no esté ya cancelada
    const currentStatus = booking.toJSON().status;
    if (currentStatus && currentStatus.name === TypeStatus.CANCELLED) {
      throw new BaseErrorException('Booking is already cancelled', HttpStatus.BAD_REQUEST);
    }

    // Obtener el estado CANCELADO
    const cancelledStatus = await this.catStatusRepository.getStatusByName(TypeStatus.CANCELLED);

    if (!cancelledStatus) {
      throw new BaseErrorException('Cancelled status not found', HttpStatus.NOT_FOUND);
    }

    // Actualizar el estado de la reserva a CANCELADO
    booking.addStatus(cancelledStatus);

    const updatedBooking = await this.bookingRepository.update(id, booking);

    if (!updatedBooking) {
      throw new BaseErrorException('Booking not updated', HttpStatus.NOT_FOUND);
    }

    // Obtener información del usuario para el email
    const user = await this.bookingRepository.findUserByBookingId(id);
    const userEmail = user.toJSON().email || email;

    // Emitir evento para enviar emails de cancelación
    this.eventEmitter.emit('send-booking.cancelled', {
      booking: updatedBooking,
      userEmail,
      lang,
    });

    return updatedBooking;
  }
}