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
import { ReservationModel } from '../../../vehicle/domain/models/reservation.model';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { IVehicleOwnerRepository } from '../../../vehicleowner/domain/repositories/vehicleowner.interface.repository';
import SymbolsVehicleOwner from '../../../vehicleowner/symbols-vehicleowner';
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

    @Inject(SymbolsVehicleOwner.IVehicleOwnerRepository)
    private readonly vehicleOwnerRepository: IVehicleOwnerRepository,

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

    // 6. Crear el booking con los datos del carrito y metadata
    const bookingData = {
      cart: JSON.stringify(cartData),
      total: body.total ?? total,
      totalPaid: body.totalPaid ?? total,
      isValidated: true,
      isReserve: body.isReserve ?? false,
      metadata: body.metadata || {},
      commission: body.commission,
      concierge: body.concierge,
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
        const bookingTotal = body.total ?? total;

        // Si viene el campo concierge, crear comisión sobre el total de la reserva
        if (body.concierge) {
          try {
            const concierge = await this.vehicleOwnerRepository.findById(body.concierge);
            if (concierge) {
              const conciergeData = concierge.toJSON();
              // Si viene commission en el body, usarlo; si no, usar el del concierge (default 15)
              const percentage = body.commission !== undefined && body.commission !== null 
                ? body.commission 
                : (conciergeData.commissionPercentage ?? 15);
              const amount = Math.round((bookingTotal * (percentage / 100)) * 100) / 100;

              await this.commissionRepository.create(
                CommissionModel.create({
                  booking: bookingId as any,
                  bookingNumber: bookingNumber as any,
                  user: userId as any,
                  vehicleOwner: body.concierge as any,
                  vehicles: [], // No hay vehículos específicos, es sobre el total
                  detail: 'Comisión Concierge',
                  status: 'PENDING',
                  amount: amount as any,
                } as any)
              );
            }
          } catch (err) {
            console.warn('Error creating concierge commission:', err);
          }
        } else if (cartData?.vehicles && Array.isArray(cartData.vehicles)) {
          // Lógica original: crear comisiones por vehículo
          const existing = await this.commissionRepository.findByBooking(bookingId);
          if (!existing || existing.length === 0) {
            for (const v of cartData.vehicles) {
              const vehicle = v.vehicle;
              const vehicleId = vehicle?._id?.toString();
              let ownerId = (vehicle as any)?.owner?._id;
              const vehicleTotal = v.total ?? 0;

              // Fallback: fetch vehicle to get owner if not present in cart JSON
              if (!ownerId && vehicleId) {
                try {
                  const fullVehicle = await this.vehicleRepository.findById(vehicleId);
                  ownerId = (((fullVehicle as any)?.toJSON?.() as any)?.owner as any)?._id ?? ownerId;
                } catch { }
              }

              if (ownerId && vehicleId && typeof vehicleTotal === 'number') {
                const percentage = (vehicle as any)?.owner?.commissionPercentage ?? 0;
                const amount = Math.round((vehicleTotal * (percentage / 100)) * 100) / 100;

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
        console.error('Error creating commissions:', e);
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
    
    // Obtener la reserva actual para comparar cambios
    const currentBooking = await this.bookingRepository.findById(id);
    if (!currentBooking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }

    const currentBookingData = currentBooking.toJSON();
    const bookingModel = BookingModel.create(res);

    const catPaymentMethod =
      await this.paymentMethodRepository.findById(paymentMethod);

    if (catPaymentMethod) bookingModel.addPaymentMethod(catPaymentMethod);

    // Nueva lógica: asignar status si viene en el payload
    const statusId = (booking as any).status;
    let newStatus = null;
    if (statusId) {
      newStatus = await this.catStatusRepository.getStatusById(statusId);
      if (newStatus) bookingModel.addStatus(newStatus);
    }
    
    // Detectar si se está cancelando la reserva
    const isBeingCancelled = newStatus && newStatus.toJSON().name === TypeStatus.CANCELLED;
    const wasNotCancelled = currentBookingData.status?.name !== TypeStatus.CANCELLED;
    
    // Si se está cancelando, liberar vehículos
    if (isBeingCancelled && wasNotCancelled) {
      try {
        const parsedCart = JSON.parse(currentBookingData.cart || '{}');
        const bookingId = currentBookingData._id?.toString();

        if (parsedCart?.vehicles?.length > 0) {
          for (const vehicleBooking of parsedCart.vehicles) {
            if (vehicleBooking.dates?.start && vehicleBooking.dates?.end && vehicleBooking.vehicle?._id) {
              await this.releaseVehicleReservation(
                vehicleBooking.vehicle._id,
                new Date(vehicleBooking.dates.start),
                new Date(vehicleBooking.dates.end),
                bookingId
              );
            }
          }
        }
      } catch (error) {
        console.error('Error releasing vehicle reservations during update:', error);
        // No fallar la actualización si falla la liberación de vehículos
      }
    }
    // Nueva lógica: actualizar total y totalPaid si vienen en el payload
    if ((booking as any).total !== undefined) {
      (bookingModel as any)._total = (booking as any).total;
    }
    if ((booking as any).totalPaid !== undefined) {
      (bookingModel as any)._totalPaid = (booking as any).totalPaid;
    }

    const updatedBooking = await this.bookingRepository.update(id, bookingModel);

    // Actualizar o crear comisiones si hay cambios relevantes
    try {
      const bookingNumber = currentBookingData.bookingNumber;
      const bookingId = currentBookingData._id?.toString();
      const hasCommissionChange = (booking as any).commission !== undefined;
      const hasConciergeChange = (booking as any).concierge !== undefined && 
                                 (booking as any).concierge?.toString() !== currentBookingData.concierge?.toString();
      const hasTotalChange = (booking as any).total !== undefined && 
                             (booking as any).total !== currentBookingData.total;
      const newConcierge = (booking as any).concierge;
      const hadConcierge = currentBookingData.concierge;

      console.log('Commission update check:', {
        bookingNumber,
        hasCommissionChange,
        hasConciergeChange,
        hasTotalChange,
        newCommission: (booking as any).commission,
        currentCommission: currentBookingData.commission,
        newTotal: (booking as any).total,
        currentTotal: currentBookingData.total,
        newConcierge,
        hadConcierge
      });

      if (hasCommissionChange || hasConciergeChange || hasTotalChange) {
        // Buscar comisiones existentes por número de reserva (solo de tipo booking)
        const existingCommissions = await this.commissionRepository.findByBookingNumber(bookingNumber);
        const bookingCommissions = existingCommissions.filter(c => 
          (c as any).source === 'booking' || !(c as any).source
        );
        
        console.log(`Found ${bookingCommissions?.length || 0} existing booking commissions for booking ${bookingNumber}`);
        
        // Si hay concierge nuevo y NO hay comisiones existentes, crear una nueva
        if (newConcierge && bookingCommissions.length === 0) {
          console.log('Creating new commission for concierge');
          try {
            const user = await this.bookingRepository.findUserByBookingId(bookingId);
            const userId = user?.toJSON()._id?.toString();
            const bookingTotal = (booking as any).total ?? currentBookingData.total;
            const commissionPercentage = (booking as any).commission ?? 15;
            const amount = Math.round((bookingTotal * (commissionPercentage / 100)) * 100) / 100;

            await this.commissionRepository.create(
              CommissionModel.create({
                booking: bookingId as any,
                bookingNumber: bookingNumber as any,
                user: userId as any,
                vehicleOwner: newConcierge as any,
                vehicles: [],
                detail: 'Comisión Concierge',
                status: 'PENDING',
                amount: amount as any,
                source: 'booking' as any,
              } as any)
            );
            console.log('Commission created successfully');
          } catch (err) {
            console.error('Error creating commission:', err);
          }
        } 
        // Si hay comisiones existentes, actualizarlas
        else if (bookingCommissions.length > 0) {
          // Preparar actualizaciones
          const updates: any = {};
          
          if (hasConciergeChange) {
            updates.vehicleOwner = newConcierge;
            console.log('Will update vehicleOwner to:', updates.vehicleOwner);
          }
          
          // Si se envía el porcentaje de comisión, recalcular el monto
          if (hasCommissionChange) {
            const newTotal = (booking as any).total ?? currentBookingData.total;
            const newCommissionPercentage = (booking as any).commission;
            const newAmount = Math.round((newTotal * (newCommissionPercentage / 100)) * 100) / 100;
            updates.amount = newAmount;
            console.log(`Recalculating amount: ${newTotal} * ${newCommissionPercentage}% = ${newAmount}`);
          } else if (hasTotalChange && !hasCommissionChange) {
            // Si solo cambió el total pero no el porcentaje, recalcular con el porcentaje actual
            const newTotal = (booking as any).total;
            const currentCommissionPercentage = currentBookingData.commission ?? 15;
            const newAmount = Math.round((newTotal * (currentCommissionPercentage / 100)) * 100) / 100;
            updates.amount = newAmount;
            console.log(`Recalculating amount with current percentage: ${newTotal} * ${currentCommissionPercentage}% = ${newAmount}`);
          }

          // Actualizar comisiones
          if (Object.keys(updates).length > 0) {
            console.log('Updating commissions with:', updates);
            const result = await this.commissionRepository.updateByBookingNumber(bookingNumber, updates);
            console.log(`Updated ${result?.length || 0} commissions`);
          } else {
            console.log('No updates to apply');
          }
        }
      } else {
        console.log('No relevant changes detected for commission update');
      }
    } catch (error) {
      console.error('Error updating commissions:', error);
      // No fallar la actualización de booking si falla la actualización de comisiones
    }

    return updatedBooking;
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

    // Liberar vehículos antes de cancelar la reserva
    try {
      const bookingData = booking.toJSON();
      const parsedCart = JSON.parse(bookingData.cart || '{}');
      const bookingId = bookingData._id?.toString();

      if (parsedCart?.vehicles?.length > 0) {
        for (const vehicleBooking of parsedCart.vehicles) {
          if (vehicleBooking.dates?.start && vehicleBooking.dates?.end && vehicleBooking.vehicle?._id) {
            await this.releaseVehicleReservation(
              vehicleBooking.vehicle._id,
              new Date(vehicleBooking.dates.start),
              new Date(vehicleBooking.dates.end),
              bookingId // Pasar el bookingId para identificación precisa
            );
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the cancellation process
      console.error('Error releasing vehicle reservations:', error);
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

  async confirmReservation(
    id: string,
    email: string,
    lang: string = 'es',
  ): Promise<BookingModel> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }

    const bookingData = booking.toJSON();

    // Verificar que la reserva tenga isReserve en true
    if (!bookingData.isReserve) {
      throw new BaseErrorException(
        'This booking is not a reservation',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Obtener el estado APROBADO
    const approvedStatus = await this.catStatusRepository.getStatusByName(
      TypeStatus.APPROVED,
    );

    if (!approvedStatus) {
      throw new BaseErrorException(
        'Approved status not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Actualizar el estado a APROBADO
    booking.addStatus(approvedStatus);

    // Confirmar la reserva (actualiza isReserve a false y totalPaid al total)
    booking.confirmReservation();

    const updatedBooking = await this.bookingRepository.update(id, booking);

    if (!updatedBooking) {
      throw new BaseErrorException(
        'Booking not updated',
        HttpStatus.NOT_FOUND,
      );
    }

    // Obtener información del usuario para el email
    const user = await this.bookingRepository.findUserByBookingId(id);
    const userEmail = user.toJSON().email || email;

    // Emitir evento para enviar emails de confirmación
    this.eventEmitter.emit('send-booking.confirmed', {
      booking: updatedBooking,
      userEmail,
      lang,
    });

    // Crear comisiones si corresponde
    try {
      const bookingJson = updatedBooking.toJSON();
      const bookingId = bookingJson._id?.toString?.() ?? '';
      const bookingNumber = bookingJson.bookingNumber;
      const bookingTotal = bookingJson.total;
      const userId = user?.toJSON()._id?.toString();

      // Si tiene concierge, crear comisión sobre el total
      if (bookingData.concierge) {
        try {
          const concierge = await this.vehicleOwnerRepository.findById(
            bookingData.concierge.toString(),
          );
          if (concierge) {
            const conciergeData = concierge.toJSON();
            const percentage =
              bookingData.commission !== undefined &&
              bookingData.commission !== null
                ? bookingData.commission
                : conciergeData.commissionPercentage ?? 15;
            const amount =
              Math.round(bookingTotal * (percentage / 100) * 100) / 100;

            await this.commissionRepository.create(
              CommissionModel.create({
                booking: bookingId as any,
                bookingNumber: bookingNumber as any,
                user: userId as any,
                vehicleOwner: bookingData.concierge as any,
                vehicles: [],
                detail: 'Comisión Concierge',
                status: 'PENDING',
                amount: amount as any,
              } as any),
            );
          }
        } catch (err) {
          console.warn('Error creating concierge commission:', err);
        }
      } else {
        // Crear comisiones por vehículo
        const parsedCart = JSON.parse(bookingData.cart || '{}');
        if (parsedCart?.vehicles && Array.isArray(parsedCart.vehicles)) {
          const existing = await this.commissionRepository.findByBooking(
            bookingId,
          );
          if (!existing || existing.length === 0) {
            for (const v of parsedCart.vehicles) {
              const vehicle = v.vehicle;
              const vehicleId = vehicle?._id?.toString();
              let ownerId = (vehicle as any)?.owner?._id;
              const vehicleTotal = v.total ?? 0;

              if (!ownerId && vehicleId) {
                try {
                  const fullVehicle =
                    await this.vehicleRepository.findById(vehicleId);
                  ownerId =
                    (((fullVehicle as any)?.toJSON?.() as any)?.owner as any)
                      ?._id ?? ownerId;
                } catch {}
              }

              if (ownerId && vehicleId && typeof vehicleTotal === 'number') {
                const percentage =
                  (vehicle as any)?.owner?.commissionPercentage ?? 0;
                const amount =
                  Math.round(vehicleTotal * (percentage / 100) * 100) / 100;

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
                  } as any),
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error creating commissions:', e);
    }

    return updatedBooking;
  }

  private async releaseVehicleReservation(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    bookingId?: string
  ): Promise<void> {
    try {
      const vehicle = await this.vehicleRepository.findById(vehicleId);
      if (!vehicle) {
        console.warn(`Vehicle ${vehicleId} not found when trying to release reservation`);
        return;
      }

      const vehicleData = vehicle.toJSON();
      if (!vehicleData.reservations || vehicleData.reservations.length === 0) {
        return;
      }

      // Filter out the reservation that matches the booking
      const updatedReservations = vehicleData.reservations.filter(reservation => {
        // Si tenemos bookingId, usarlo como identificador principal
        if (bookingId && reservation.bookingId) {
          return reservation.bookingId !== bookingId;
        }

        // Fallback: usar fechas con tolerancia
        const reservationStart = new Date(reservation.start).getTime();
        const reservationEnd = new Date(reservation.end).getTime();
        const bookingStart = startDate.getTime();
        const bookingEnd = endDate.getTime();

        // Allow some tolerance for date differences (5 minutes for better safety)
        const startDiff = Math.abs(reservationStart - bookingStart);
        const endDiff = Math.abs(reservationEnd - bookingEnd);

        // Return true to keep the reservation, false to remove it
        return !(startDiff <= 300000 && endDiff <= 300000); // 5 minutes tolerance
      });

      // Update the vehicle with the filtered reservations
      const updatedVehicle = vehicle;
      updatedVehicle.setReservations(
        updatedReservations.map(res => ReservationModel.create({
          start: res.start,
          end: res.end,
          bookingId: res.bookingId,
          reservationId: res.reservationId
        }))
      );

      await this.vehicleRepository.update(vehicleId, updatedVehicle);
      
      console.log(`Reserva liberada para vehículo ${vehicleId}${bookingId ? ` (booking: ${bookingId})` : ` (fechas: ${startDate} - ${endDate})`}`);
    } catch (error) {
      console.error(`Error releasing reservation for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }
}