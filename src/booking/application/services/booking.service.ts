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
import { getTranslation, formatDate } from '../../../core/utils/translations.helper';
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

  async create(booking: ICreateBooking, id: string, lang: string = 'es'): Promise<BookingModel> {
    const { paymentMethod, ...res } = booking;
    
    // ✅ VALIDAR DISPONIBILIDAD DE VEHÍCULOS ANTES DE CREAR EL BOOKING
    // Parsear el cart para verificar si hay vehículos
    if (booking.cart) {
      try {
        const cartData = JSON.parse(booking.cart);
        
        if (cartData.vehicles && cartData.vehicles.length > 0) {
          for (const vehicleItem of cartData.vehicles) {
            const vehicleId = typeof vehicleItem.vehicle === 'string' 
              ? vehicleItem.vehicle 
              : vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
            
            if (!vehicleId) {
              console.error('[BookingService.create] Vehicle ID not found in cart item');
              continue;
            }

            const startDate = new Date(vehicleItem.dates.start);
            const endDate = new Date(vehicleItem.dates.end);

            // Verificar disponibilidad del vehículo
            const vehicle = await this.vehicleRepository.findById(vehicleId);
            if (!vehicle) {
              throw new BaseErrorException(
                `Vehicle ${vehicleId} not found`,
                HttpStatus.NOT_FOUND,
              );
            }

            const vehicleData = vehicle.toJSON();
            
            // Verificar si el vehículo tiene reservas que se solapen con las fechas solicitadas
            if (vehicleData.reservations && vehicleData.reservations.length > 0) {
              const hasConflict = vehicleData.reservations.some((reservation: any) => {
                const reservationStart = new Date(reservation.start).getTime();
                const reservationEnd = new Date(reservation.end).getTime();
                const requestedStart = startDate.getTime();
                const requestedEnd = endDate.getTime();

                // Verificar si hay solapamiento de fechas
                return (
                  (requestedStart >= reservationStart && requestedStart < reservationEnd) ||
                  (requestedEnd > reservationStart && requestedEnd <= reservationEnd) ||
                  (requestedStart <= reservationStart && requestedEnd >= reservationEnd)
                );
              });

              if (hasConflict) {
                const vehicleName = vehicleData.name || vehicleId;
                const formattedStartDate = formatDate(startDate, lang);
                const formattedEndDate = formatDate(endDate, lang);
                
                throw new BaseErrorException(
                  getTranslation('vehicleNotAvailable', lang, vehicleName, formattedStartDate, formattedEndDate),
                  HttpStatus.CONFLICT,
                );
              }
            }
          }
        }
      } catch (error) {
        // Si es un error de validación, propagarlo
        if (error instanceof BaseErrorException) {
          throw error;
        }
        // Para otros errores (ej: JSON parse), registrar pero continuar
        console.error('[BookingService.create] Error validating vehicle availability:', error);
      }
    }
    
    const bookingModel = BookingModel.create(res);

    const catPaymentMethod =
      await this.paymentMethodRepository.findById(paymentMethod);

    if (!catPaymentMethod) {
      throw new BaseErrorException(
        'CatPaymentMethod not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Para Crédito/Débito y Efectivo desde la web, iniciar como RECHAZADO
    // Para otros métodos (Transferencia), iniciar como PENDIENTE
    const paymentMethodName = catPaymentMethod.toJSON().name;
    const requiresStripePayment = paymentMethodName === 'Credito/Debito' || 
                                  paymentMethodName === 'Credito' || 
                                  paymentMethodName === 'Debito' ||
                                  paymentMethodName === 'Efectivo';
    
    const statusType = requiresStripePayment ? TypeStatus.REJECTED : TypeStatus.PENDING;
    const status = await this.catStatusRepository.getStatusByName(statusType);

    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    console.log(`[BookingService.create] Método de pago: ${paymentMethodName}, Status inicial: ${statusType}`);

    bookingModel.addStatus(status);

    bookingModel.addPaymentMethod(catPaymentMethod);

    const bookingSave = await this.bookingRepository.create(bookingModel, id);

    // Registrar pago inicial automáticamente si totalPaid > 0
    if (booking.totalPaid && booking.totalPaid > 0) {
      // Cuando se paga desde la web, siempre es STRIPE (crédito/débito)
      // independientemente de si es reserva o pago completo
      const paymentType = 'STRIPE';
      const percentage = booking.isReserve 
        ? Math.round((booking.totalPaid / booking.total) * 100) 
        : 100;
      
      bookingSave.addPayment({
        amount: booking.totalPaid,
        paymentMethod: paymentMethod, // ID del método de pago
        // NO incluir paymentMedium (viene de la web)
        paymentDate: new Date(),
        paymentType: paymentType,
        percentage: percentage,
        notes: booking.isReserve 
          ? `Pago inicial (${percentage}%) - Crédito/Débito`
          : `Pago completo - Crédito/Débito`,
        status: 'PAID'
      });
      
      // Actualizar el booking con el pago registrado
      await this.bookingRepository.update(bookingSave.toJSON()._id.toString(), bookingSave);
      
      console.log(`[BookingService] Pago inicial registrado: ${booking.totalPaid} MXN (${percentage}%) - STRIPE (Crédito/Débito)`);
    }

    // Obtener el email del usuario para enviar notificación
    // NOTA: Los emails solo se envían cuando el booking viene del Dashboard (source: 'Dashboard')
    // Para bookings de Web (source: 'Web'), NO se envían emails
    try {
      const user = await this.bookingRepository.findUserByBookingId(bookingSave.toJSON()._id?.toString());
      const userEmail = user?.toJSON()?.email;

      if (userEmail) {
        const bookingJson = bookingSave.toJSON();
        const paymentMethodName = catPaymentMethod.toJSON().name;
        
        // Solo enviar email de confirmación si NO es un método de pago que requiere confirmación posterior
        const requiresPaymentConfirmation = 
          paymentMethodName === 'Credito/Debito' || 
          paymentMethodName === 'Efectivo' ||
          paymentMethodName === 'Credito' ||
          paymentMethodName === 'Debito';

        if (!requiresPaymentConfirmation) {
          console.log('[BookingService] 📧 Emitiendo evento send-booking.created (desde create)');
          console.log('[BookingService] Datos del evento:', {
            bookingId: bookingJson._id,
            bookingNumber: bookingJson.bookingNumber,
            userEmail: userEmail,
            lang,
            isReserve: bookingJson.isReserve,
            total: bookingJson.total,
            totalPaid: bookingJson.totalPaid,
            paymentMethod: paymentMethodName
          });

          this.eventEmitter.emit('send-booking.created', {
            updatedBooking: bookingSave,
            userEmail: userEmail,
            lang,
          });

          console.log('[BookingService] ✅ Evento send-booking.created emitido (desde create)');
        } else {
          console.log('[BookingService] ⏸️ Email NO enviado - método de pago requiere confirmación:', paymentMethodName);
          console.log('[BookingService] El email se enviará cuando el usuario vuelva de Stripe sin completar el pago');
        }
      } else {
        console.warn('[BookingService] ⚠️ No se pudo obtener el email del usuario, no se enviará notificación');
      }
    } catch (error) {
      console.error('[BookingService] ❌ Error emitiendo evento de notificación:', error);
      // No fallar la creación del booking si falla el envío del email
    }

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

    // 2.5. VALIDAR DISPONIBILIDAD DE VEHÍCULOS ANTES DE CREAR EL BOOKING
    if (cartData.vehicles && cartData.vehicles.length > 0) {
      for (const vehicleItem of cartData.vehicles) {
        const vehicleId = typeof vehicleItem.vehicle === 'string' 
          ? vehicleItem.vehicle 
          : vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
        
        if (!vehicleId) {
          console.error('[BookingService] Vehicle ID not found in cart item');
          continue;
        }

        const startDate = new Date(vehicleItem.dates.start);
        const endDate = new Date(vehicleItem.dates.end);

        // Verificar disponibilidad del vehículo
        const vehicle = await this.vehicleRepository.findById(vehicleId);
        if (!vehicle) {
          throw new BaseErrorException(
            `Vehicle ${vehicleId} not found`,
            HttpStatus.NOT_FOUND,
          );
        }

        const vehicleData = vehicle.toJSON();
        
        // Verificar si el vehículo tiene reservas que se solapen con las fechas solicitadas
        if (vehicleData.reservations && vehicleData.reservations.length > 0) {
          const hasConflict = vehicleData.reservations.some((reservation: any) => {
            const reservationStart = new Date(reservation.start).getTime();
            const reservationEnd = new Date(reservation.end).getTime();
            const requestedStart = startDate.getTime();
            const requestedEnd = endDate.getTime();

            // Verificar si hay solapamiento de fechas
            return (
              (requestedStart >= reservationStart && requestedStart < reservationEnd) ||
              (requestedEnd > reservationStart && requestedEnd <= reservationEnd) ||
              (requestedStart <= reservationStart && requestedEnd >= reservationEnd)
            );
          });

          if (hasConflict) {
            const vehicleName = vehicleData.name || vehicleId;
            throw new BaseErrorException(
              `El vehículo ${vehicleName} no está disponible en las fechas seleccionadas (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
              HttpStatus.CONFLICT,
            );
          }
        }
      }
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

    // 6. Extraer información de delivery del cart
    let deliveryInfo: any = {};
    
    // Buscar delivery en los vehículos del cart
    if (cartData.vehicles && cartData.vehicles.length > 0) {
      const vehicleWithDelivery = cartData.vehicles.find(v => v.delivery?.requiresDelivery);
      if (vehicleWithDelivery && vehicleWithDelivery.delivery) {
        deliveryInfo = {
          requiresDelivery: vehicleWithDelivery.delivery.requiresDelivery,
          deliveryType: vehicleWithDelivery.delivery.deliveryType,
          oneWayType: vehicleWithDelivery.delivery.oneWayType,
          deliveryAddress: vehicleWithDelivery.delivery.deliveryAddress,
          deliveryCost: vehicleWithDelivery.delivery.deliveryCost,
          deliveryDistance: vehicleWithDelivery.delivery.distance,
        };
      }
    }
    
    // También verificar si hay delivery a nivel de cart (formato antiguo)
    if (cartData.delivery && cartData.deliveryAddress) {
      deliveryInfo = {
        requiresDelivery: cartData.delivery,
        deliveryType: 'round-trip', // Valor por defecto para formato antiguo
        oneWayType: null,
        deliveryAddress: cartData.deliveryAddress,
        deliveryCost: 0,
        deliveryDistance: undefined,
      };
    }

    // 6.5. Si no viene concierge, asignar TIENDA por defecto
    let conciergeId = body.concierge;
    if (!conciergeId) {
      // ID fijo del vendedor TIENDA
      const TIENDA_CONCIERGE_ID = '68f05300221a9f9d4b316517';
      conciergeId = TIENDA_CONCIERGE_ID;
      console.log(`[BookingService] No se proporcionó concierge, asignando TIENDA por defecto: ${conciergeId}`);
    }

    // 7. Crear el booking con los datos del carrito, metadata y delivery
    const bookingData = {
      cart: JSON.stringify(cartData),
      total: body.total ?? total,
      totalPaid: body.totalPaid ?? total,
      isValidated: true,
      isReserve: body.isReserve ?? false,
      metadata: body.metadata || {},
      commission: body.commission,
      concierge: conciergeId,
      ...deliveryInfo, // Agregar información de delivery
    };

    const bookingModel = BookingModel.create(bookingData);

    // 7. Agregar status
    // Si isReserve=true, el status debe ser PENDIENTE (independientemente del status enviado)
    // Si isReserve=false, usar el status enviado
    let status;
    if (bookingData.isReserve) {
      console.log('[BookingService] isReserve=true, estableciendo status PENDIENTE');
      status = await this.catStatusRepository.getStatusByName(TypeStatus.PENDING);
    } else {
      status = await this.catStatusRepository.getStatusById(body.status);
    }
    
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

    // 8.5. CREAR RESERVAS EN LOS VEHÍCULOS
    if (cartData.vehicles && cartData.vehicles.length > 0) {
      const bookingId = bookingSave.toJSON()._id?.toString();
      
      for (const vehicleItem of cartData.vehicles) {
        try {
          const vehicleId = typeof vehicleItem.vehicle === 'string' 
            ? vehicleItem.vehicle 
            : vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
          
          if (!vehicleId) {
            console.error('[BookingService] Vehicle ID not found in cart item');
            continue;
          }

          const startDate = new Date(vehicleItem.dates.start);
          const endDate = new Date(vehicleItem.dates.end);

          // ✅ VALIDACIÓN ATÓMICA: Obtener el vehículo y verificar disponibilidad en tiempo real
          // Esta validación se hace justo antes de crear la reserva para evitar race conditions
          const vehicle = await this.vehicleRepository.findById(vehicleId);
          if (!vehicle) {
            console.error(`[BookingService] Vehicle ${vehicleId} not found when creating reservation`);
            continue;
          }

          const vehicleData = vehicle.toJSON() as any;
          
          // Crear la reserva
          const updatedReservations = [
            ...(vehicleData.reservations || []),
            {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              bookingId: bookingId,
              reservationId: bookingId, // Usar el bookingId como reservationId también
            }
          ];

          // Actualizar el vehículo con la nueva reserva
          vehicle.setReservations(
            updatedReservations.map(res => ReservationModel.create(res))
          );

          await this.vehicleRepository.update(vehicleId, vehicle);

          console.log(`[BookingService] ✅ Reserva creada exitosamente para vehículo ${vehicleId} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);
        } catch (error) {
          console.error(`[BookingService] ❌ Error creating reservation for vehicle:`, error);
          // Si es un error de conflicto o NOT_FOUND, propagarlo para que el usuario lo vea
          if (error instanceof BaseErrorException && 
              (error.statusCode === HttpStatus.CONFLICT || error.statusCode === HttpStatus.NOT_FOUND)) {
            throw error;
          }
          // Para otros errores, registrar pero no fallar
          console.error(`[BookingService] Error no crítico al crear reserva, continuando...`);
        }
      }
    }

    const bookingJson = bookingSave.toJSON();
    const paymentMethodName = paymentMethods.toJSON().name;
    const bookingSource = (body as any).source || 'Web';
    
    // Solo enviar email de confirmación si NO es un método de pago que requiere confirmación posterior
    // Para crédito/débito y efectivo, NO enviamos email hasta que se confirme el pago
    const requiresPaymentConfirmation = 
      paymentMethodName === 'Credito/Debito' || 
      paymentMethodName === 'Efectivo' ||
      paymentMethodName === 'Credito' ||
      paymentMethodName === 'Debito';

    // LÓGICA DE ENVÍO DE EMAILS:
    // - Dashboard: SIEMPRE enviar email inmediatamente (sin importar método de pago)
    // - Web con Transferencia: Enviar email de PENDIENTE inmediatamente
    // - Web con otros métodos que requieren confirmación: Esperar a validateBooking
    const isTransferencia = paymentMethodName === 'Transferencia';
    const shouldSendEmail = bookingSource === 'Dashboard' || !requiresPaymentConfirmation || (bookingSource === 'Web' && isTransferencia);

    if (shouldSendEmail) {
      console.log('[BookingService] 📧 Emitiendo evento send-booking.created');
      console.log('[BookingService] Datos del evento:', {
        bookingId: bookingJson._id,
        bookingNumber: bookingJson.bookingNumber,
        userEmail: email,
        lang,
        isReserve: bookingJson.isReserve,
        total: bookingJson.total,
        totalPaid: bookingJson.totalPaid,
        paymentMethod: paymentMethodName,
        source: bookingSource,
        reason: bookingSource === 'Dashboard' ? 'Dashboard booking' : 
                isTransferencia ? 'Transferencia - enviar email pendiente' : 
                'Método no requiere confirmación'
      });

      // Para Transferencia desde Web, forzar isReserve=true para que use el template de PENDIENTE
      const bookingForEmail = (bookingSource === 'Web' && isTransferencia) 
        ? { ...bookingSave.toJSON(), isReserve: true }
        : bookingSave.toJSON();
      
      const bookingModelForEmail = {
        toJSON: () => bookingForEmail
      } as BookingModel;

      this.eventEmitter.emit('send-booking.created', {
        updatedBooking: bookingModelForEmail,
        userEmail: email,
        lang,
        source: bookingSource, // ✅ Pasar el source directamente en el evento
      });

      console.log('[BookingService] ✅ Evento send-booking.created emitido');
    } else {
      console.log('[BookingService] ⏸️ Email NO enviado - método de pago requiere confirmación:', paymentMethodName);
      console.log('[BookingService] El email se enviará cuando se confirme el pago mediante validateBooking');
    }

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
        // IMPORTANTE: Verificar si ya existe una comisión para este booking
        const existing = await this.commissionRepository.findByBooking(bookingId);
        const hasConciergeCommission = existing && existing.some((c: any) => {
        const commData = c.toJSON ? c.toJSON() : c;
        return commData.vehicleOwner?.toString() === body.concierge?.toString();
        });
        
        if (!hasConciergeCommission) {
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
        console.log('[BookingService] Comisión de concierge creada exitosamente');
        } else {
        console.warn('[BookingService] Concierge no encontrado:', body.concierge);
        }
        } else {
        console.log('[BookingService] Comisión de concierge ya existe, omitiendo creación');
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
    
    // Detectar si se está eliminando el delivery - VERIFICAR AMBAS ESTRUCTURAS
    // IMPORTANTE: Solo detectar eliminación si se está enviando explícitamente el cart
    // Si no se envía el cart, NO eliminar el delivery (puede ser solo actualización de estado u otros campos)
    let isRemovingDelivery = false;
    let hadDeliveryInBooking = false;
    let hasDeliveryInBooking = false;
    let hadDeliveryInCart = false;
    let hasDeliveryInCart = false;
    
    // Solo verificar eliminación de delivery si se está enviando un cart nuevo
    if ((booking as any).cart) {
      // 1. Verificar en los campos del booking
      hadDeliveryInBooking = currentBookingData.requiresDelivery && currentBookingData.deliveryCost && currentBookingData.deliveryCost > 0;
      hasDeliveryInBooking = (booking as any).requiresDelivery !== undefined 
        ? ((booking as any).requiresDelivery && (booking as any).deliveryCost && (booking as any).deliveryCost > 0)
        : hadDeliveryInBooking; // Si no se envía requiresDelivery, mantener el valor actual
      
      // 2. Verificar en el cart (si viene un cart nuevo)
      try {
        const newCartData = JSON.parse((booking as any).cart);
        
        // Verificar formato antiguo (delivery a nivel de cart)
        hasDeliveryInCart = newCartData.delivery === true;
        
        // Verificar formato nuevo (delivery en vehículos)
        if (!hasDeliveryInCart && newCartData.vehicles && Array.isArray(newCartData.vehicles)) {
          hasDeliveryInCart = newCartData.vehicles.some((v: any) => 
            v.delivery && v.delivery.requiresDelivery === true
          );
        }
      } catch (e) {
        console.error('[BookingService] Error parsing new cart:', e);
      }
      
      // Verificar delivery en el cart actual
      if (currentBookingData.cart) {
        try {
          const currentCartData = JSON.parse(currentBookingData.cart);
          
          // Verificar formato antiguo
          hadDeliveryInCart = currentCartData.delivery === true;
          
          // Verificar formato nuevo
          if (!hadDeliveryInCart && currentCartData.vehicles && Array.isArray(currentCartData.vehicles)) {
            hadDeliveryInCart = currentCartData.vehicles.some((v: any) => 
              v.delivery && v.delivery.requiresDelivery === true
            );
          }
        } catch (e) {
          console.error('[BookingService] Error parsing current cart:', e);
        }
      }
      
      // Se está eliminando el delivery si:
      // - Tenía delivery en booking Y ahora no lo tiene en booking
      // - O tenía delivery en cart Y ahora no lo tiene en cart
      isRemovingDelivery = (hadDeliveryInBooking && !hasDeliveryInBooking) || 
                          (hadDeliveryInCart && !hasDeliveryInCart);
    }
    
    console.log('[BookingService] Delivery check:', {
      hadDeliveryInBooking,
      hasDeliveryInBooking,
      hadDeliveryInCart,
      hasDeliveryInCart,
      isRemovingDelivery,
      cartSent: !!(booking as any).cart,
      currentDeliveryCost: currentBookingData.deliveryCost,
      newDeliveryCost: (booking as any).deliveryCost
    });
    
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

    // Si se está eliminando el delivery, buscar y eliminar el movimiento de DELIVERY del histórico del contrato
    if (isRemovingDelivery) {
      try {
        console.log('[BookingService] Eliminando movimiento de DELIVERY del histórico del contrato...');
        
        // Buscar el contrato asociado a este booking
        const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
        const contract = await Contract.findOne({ booking: id });
        
        if (contract) {
          console.log(`[BookingService] Contrato encontrado: ${contract._id}`);
          
          // Buscar el evento de DELIVERY en el histórico del contrato
          const ContractHistory = this.bookingRepository['bookingDB'].db.model('ContractHistory');
          const CatContractEvent = this.bookingRepository['bookingDB'].db.model('CatContractEvent');
          
          // Buscar el evento de DELIVERY en el catálogo
          const deliveryEvent = await CatContractEvent.findOne({ name: 'DELIVERY' });
          
          if (deliveryEvent) {
            // Buscar la entrada del histórico con este evento
            const deliveryHistoryEntry = await ContractHistory.findOne({
              contract: contract._id,
              eventType: deliveryEvent._id,
              isDeleted: false
            });
            
            if (deliveryHistoryEntry) {
              console.log(`[BookingService] Entrada de DELIVERY encontrada en el histórico: ${deliveryHistoryEntry._id}`);
              
              // Marcar como eliminada
              deliveryHistoryEntry.isDeleted = true;
              deliveryHistoryEntry.deletedAt = new Date();
              deliveryHistoryEntry.deletionReason = 'Eliminado automáticamente al quitar el delivery del booking';
              
              await deliveryHistoryEntry.save();
              
              // Si tiene un movimiento relacionado, eliminarlo también
              if (deliveryHistoryEntry.relatedMovement) {
                const Movement = this.bookingRepository['bookingDB'].db.model('Movement');
                const movement = await Movement.findById(deliveryHistoryEntry.relatedMovement);
                
                if (movement && !movement.isDeleted) {
                  console.log(`[BookingService] Eliminando movimiento relacionado: ${movement._id}`);
                  
                  movement.isDeleted = true;
                  movement.deletedAt = new Date();
                  movement.deletionReason = 'Eliminado automáticamente al quitar el delivery del booking';
                  
                  await movement.save();
                  console.log('[BookingService] Movimiento de DELIVERY eliminado exitosamente');
                }
              }
              
              // AJUSTAR TOTALES SEGÚN LAS REGLAS:
              // 1. Total General: SIEMPRE restar el delivery
              // 2. Total Pagado: Solo restar si es igual al Total General (pago completo)
              // 3. Total Inicial: Solo restar si el delivery fue incluido originalmente
              
              const deliveryCost = currentBookingData.deliveryCost || 0;
              const currentTotal = currentBookingData.total || 0;
              const currentTotalPaid = currentBookingData.totalPaid || 0;
              
              console.log(`[BookingService] Ajustando totales después de eliminar delivery:`);
              console.log(`[BookingService] - Delivery Cost: ${deliveryCost}`);
              console.log(`[BookingService] - Total Actual: ${currentTotal}`);
              console.log(`[BookingService] - Total Pagado Actual: ${currentTotalPaid}`);
              
              // IMPORTANTE: NO modificar booking.total para preservar el Total Inicial
              // El sistema de bookingTotals calculará el netTotal restando el delivery del histórico
              console.log(`[BookingService] - Total General NO se modifica (se mantiene en ${currentTotal}) para preservar Total Inicial`);
              
              // Calcular nuevo Total Pagado
              // Restar delivery si:
              // a) Era pago completo (totalPaid === total)
              // b) O si el totalPaid incluye el delivery (totalPaid >= deliveryCost)
              let newTotalPaid = currentTotalPaid;
              const wasFullyPaid = currentTotalPaid === currentTotal;
              const totalPaidIncludesDelivery = currentTotalPaid >= deliveryCost;
              
              if (wasFullyPaid) {
                newTotalPaid = Math.max(0, currentTotalPaid - deliveryCost);
                console.log(`[BookingService] - Era pago completo, restando delivery del Total Pagado: ${currentTotalPaid} - ${deliveryCost} = ${newTotalPaid}`);
              } else if (totalPaidIncludesDelivery && currentTotalPaid > 0) {
                // Si el totalPaid incluye el delivery, restarlo
                newTotalPaid = Math.max(0, currentTotalPaid - deliveryCost);
                console.log(`[BookingService] - Total Pagado incluye delivery, restando: ${currentTotalPaid} - ${deliveryCost} = ${newTotalPaid}`);
              } else {
                console.log(`[BookingService] - Total Pagado NO incluye delivery o es 0, se mantiene en: ${newTotalPaid}`);
              }
              
              // Actualizar el booking SOLO con totalPaid y campos de delivery
              // NO modificar booking.total para preservar el Total Inicial
              const updateFields: any = {
                totalPaid: newTotalPaid,
                requiresDelivery: false,
                deliveryType: null,
                oneWayType: null,
                deliveryAddress: null,
                deliveryCost: 0
              };
              
              await this.bookingRepository['bookingDB'].updateOne(
                { _id: id },
                { $set: updateFields }
              );
              
              console.log(`[BookingService] ✅ Totales actualizados en la base de datos`);
              console.log(`[BookingService] - Total General: ${currentTotal} (sin cambios - preserva Total Inicial)`);
              console.log(`[BookingService] - Total Pagado: ${currentTotalPaid} → ${newTotalPaid}`);
              console.log(`[BookingService] - El netTotal se calculará automáticamente restando el delivery eliminado del histórico`);
              
              // Actualizar el objeto updatedBooking para reflejar los cambios
              // NO actualizar _total para preservar el Total Inicial
              (updatedBooking as any)._totalPaid = newTotalPaid;
              
              console.log('[BookingService] Entrada de DELIVERY eliminada exitosamente del histórico');
            } else {
              console.log('[BookingService] No se encontró entrada de DELIVERY en el histórico');
            }
          }
          
          // Limpiar los campos de delivery del booking
          console.log('[BookingService] Limpiando campos de delivery del booking...');
          await this.bookingRepository['bookingDB'].updateOne(
            { _id: id },
            { 
              $set: { 
                requiresDelivery: false,
                deliveryType: null,
                oneWayType: null,
                deliveryAddress: null,
                deliveryCost: 0
              } 
            }
          );
          console.log('[BookingService] Campos de delivery del booking limpiados');
          
          // Limpiar el delivery del cart
          if (currentBookingData.cart) {
            try {
              const currentCartData = JSON.parse(currentBookingData.cart);
              
              // Limpiar delivery del formato antiguo (a nivel de cart)
              if (currentCartData.delivery !== undefined) {
                currentCartData.delivery = false;
                currentCartData.deliveryAddress = null;
              }
              
              // Limpiar delivery del formato nuevo (en vehículos)
              if (currentCartData.vehicles && Array.isArray(currentCartData.vehicles)) {
                currentCartData.vehicles = currentCartData.vehicles.map((v: any) => {
                  if (v.delivery) {
                    return {
                      ...v,
                      delivery: {
                        requiresDelivery: false,
                        deliveryType: null,
                        oneWayType: null,
                        deliveryAddress: null,
                        deliveryCost: 0
                      }
                    };
                  }
                  return v;
                });
              }
              
              // Actualizar el cart en el booking
              await this.bookingRepository['bookingDB'].updateOne(
                { _id: id },
                { $set: { cart: JSON.stringify(currentCartData) } }
              );
              
              console.log('[BookingService] Delivery eliminado del cart exitosamente');
            } catch (cartError) {
              console.error('[BookingService] Error limpiando delivery del cart:', cartError);
            }
          }
        } else {
          console.log('[BookingService] No se encontró contrato asociado al booking');
        }
      } catch (error) {
        console.error('[BookingService] Error eliminando movimiento de DELIVERY:', error);
        // No fallar la actualización del booking si falla la eliminación del delivery
      }
    }

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
    paidAmount?: number, // Monto pagado (opcional, para pagos parciales)
    paymentsData?: any, // Datos de pagos desde el frontend
  ): Promise<BookingModel> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }
    
    // Guardar el estado anterior de isReserve para detectar si cambió
    const bookingData = booking.toJSON();
    const wasReserve = bookingData.isReserve;
    const previousTotal = bookingData.total;
    const previousTotalPaid = bookingData.totalPaid || 0;
    
    console.log('='.repeat(80));
    console.log(`[BookingService] 🔍 VALIDANDO RESERVA #${bookingData.bookingNumber || id}`);
    console.log('='.repeat(80));
    console.log(`[BookingService] Estado inicial: isReserve=${wasReserve}, total=${previousTotal}, totalPaid=${previousTotalPaid}, isValidated actual=${bookingData.isValidated}`);
    console.log(`[BookingService] Parámetro isValidated recibido: ${isValidated}`);
    
    // Buscar el contrato asociado para verificar el source
    let contractSource = 'Web'; // Por defecto Web
    try {
      const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
      const contract = await Contract.findOne({ booking: id }).lean();
      if (contract) {
        contractSource = contract.source || 'Web';
      }
    } catch (error) {
      console.warn('[BookingService] No se pudo obtener el source del contrato:', error.message);
    }
    
    const paymentMethodName = booking.toJSON().paymentMethod.name;
    let status;
    
    console.log(`[BookingService] Método de pago: ${paymentMethodName}`);
    console.log(`[BookingService] Source: ${contractSource}`);
    console.log(`[BookingService] Paid: ${paid}`);
    console.log(`[BookingService] isValidated: ${isValidated}`);
    console.log('-'.repeat(80));
    
    if (paymentMethodName === 'Credito/Debito') {
      // Para Crédito/Débito:
      // - Si paid=true: APROBADO (pago exitoso en Stripe)
      // - Si paid=false + isValidated=true: RECHAZADO (usuario canceló el pago en Stripe)
      // - Si paid=false + isValidated=false: PENDIENTE (usuario navegó hacia atrás sin completar)
      //   PERO mantener isValidated=false para que se muestre como "NO VALIDADO"
      if (paid) {
        status = await this.catStatusRepository.getStatusByName(TypeStatus.APPROVED);
        console.log(`[BookingService] ✅ RESERVA #${bookingData.bookingNumber} → APROBADA`);
        console.log(`[BookingService] Motivo: Pago exitoso en Stripe (Crédito/Débito)`);
      } else if (isValidated) {
        status = await this.catStatusRepository.getStatusByName(TypeStatus.REJECTED);
        console.log(`[BookingService] ❌ RESERVA #${bookingData.bookingNumber} → RECHAZADA`);
        console.log(`[BookingService] Motivo: Usuario canceló el pago en Stripe (paid=false + isValidated=true)`);
      } else {
        // Usuario navegó hacia atrás - mantener como PENDIENTE pero NO VALIDADO
        status = await this.catStatusRepository.getStatusByName(TypeStatus.PENDING);
        console.log(`[BookingService] ⏸️ RESERVA #${bookingData.bookingNumber} → PENDIENTE (NO VALIDADA)`);
        console.log(`[BookingService] Motivo: Usuario navegó hacia atrás sin completar el pago (paid=false + isValidated=false)`);
      }
    } else if (paymentMethodName === "Efectivo") {
      // Para Efectivo: aprobar solo si paid=true, rechazar si paid=false
      status = await this.catStatusRepository.getStatusByName(
        paid ? TypeStatus.APPROVED : TypeStatus.REJECTED
      );
      
      if (paid) {
        console.log(`[BookingService] ✅ RESERVA #${bookingData.bookingNumber} → APROBADA`);
        console.log(`[BookingService] Motivo: Pago en efectivo confirmado (paid=true)`);
      } else {
        console.log(`[BookingService] ❌ RESERVA #${bookingData.bookingNumber} → RECHAZADA`);
        console.log(`[BookingService] Motivo: Pago en efectivo no confirmado (paid=false)`);
      }
    } else if (paymentMethodName === "Transferencia") {
      // Para Transferencia desde WEB: siempre queda PENDIENTE hasta que el admin lo apruebe manualmente
      // Para Transferencia desde DASHBOARD: usar paid para determinar el estado
      if (contractSource === 'Web') {
        status = await this.catStatusRepository.getStatusByName(
          TypeStatus.PENDING
        );
        console.log(`[BookingService] ⏸️ RESERVA #${bookingData.bookingNumber} → PENDIENTE`);
        console.log(`[BookingService] Motivo: Transferencia desde Web - requiere aprobación manual del admin`);
      } else {
        status = await this.catStatusRepository.getStatusByName(
          paid ? TypeStatus.APPROVED : TypeStatus.PENDING
        );
        
        if (paid) {
          console.log(`[BookingService] ✅ RESERVA #${bookingData.bookingNumber} → APROBADA`);
          console.log(`[BookingService] Motivo: Transferencia desde Dashboard confirmada (paid=true)`);
        } else {
          console.log(`[BookingService] ⏸️ RESERVA #${bookingData.bookingNumber} → PENDIENTE`);
          console.log(`[BookingService] Motivo: Transferencia desde Dashboard sin confirmar (paid=false)`);
        }
      }
    } else {
      // Para otros métodos de pago, usar paid para determinar el estado
      status = await this.catStatusRepository.getStatusByName(
        paid ? TypeStatus.APPROVED : TypeStatus.PENDING
      );
      
      if (paid) {
        console.log(`[BookingService] ✅ RESERVA #${bookingData.bookingNumber} → APROBADA`);
        console.log(`[BookingService] Motivo: Pago confirmado con método ${paymentMethodName} (paid=true)`);
      } else {
        console.log(`[BookingService] ⏸️ RESERVA #${bookingData.bookingNumber} → PENDIENTE`);
        console.log(`[BookingService] Motivo: Pago no confirmado con método ${paymentMethodName} (paid=false)`);
      }
    }
    
    console.log('='.repeat(80));

    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    booking.addStatus(status);

    // Si se proporciona un monto pagado, usarlo; si no, usar el comportamiento por defecto
    console.log(`[BookingService] validateBooking - Antes de payBooking: isReserve=${booking.toJSON().isReserve}, totalPaid=${booking.toJSON().totalPaid}`);
    booking.payBooking(paid, paidAmount);
    console.log(`[BookingService] validateBooking - Después de payBooking: isReserve=${booking.toJSON().isReserve}, totalPaid=${booking.toJSON().totalPaid}`);
    
    // CORRECCIÓN CRÍTICA: Para Crédito/Débito, NUNCA debe ser isReserve=true
    // Solo Efectivo puede tener "Reserva 20%"
    if (paymentMethodName === 'Credito/Debito' && !paid) {
      // Si el pago fue rechazado (paid=false), establecer isReserve=false y totalPaid=0
      (booking as any)._isReserve = false;
      (booking as any)._totalPaid = 0;
      console.log('[BookingService] Crédito/Débito rechazado: isReserve=false, totalPaid=0');
    }

    // Registrar los pagos en el historial
    // Obtener el usuario que está validando (para validatedBy)
    let validatedBy: string | undefined;
    let validatedAt: Date | undefined;
    
    try {
      const validatingUser = await this.userRepository.findByEmail(email);
      validatedBy = validatingUser?.toJSON()._id?.toString();
      validatedAt = new Date();
    } catch (error) {
      console.warn('[BookingService] No se pudo obtener el usuario validador:', error);
    }
    
    // PRIORIDAD 1: Si vienen paymentsData (array o formato {initial, final}), SOLO usar esos y limpiar todo lo demás
    if (paymentsData && Array.isArray(paymentsData) && paymentsData.length > 0) {
      // Caso: Validación desde dashboard con múltiples pagos (formato array)
      // LIMPIAR el array de pagos existente y reemplazarlo con los nuevos
      console.log('[BookingService] Reemplazando TODOS los pagos existentes con los del dashboard (formato array)');
      console.log('[BookingService] Pagos a registrar:', paymentsData);
      
      // Limpiar pagos existentes
      (booking as any)._payments = [];
      
      for (const paymentData of paymentsData) {
        const paymentType = paymentData.paymentType || 
                           (paymentData.paymentMethod?.toLowerCase().includes('credito') || 
                            paymentData.paymentMethod?.toLowerCase().includes('debito') ? 'STRIPE' :
                            paymentData.paymentMethod?.toLowerCase().includes('efectivo') ? 'CASH' :
                            paymentData.paymentMethod?.toLowerCase().includes('transferencia') ? 'TRANSFER' : 'OTHER');
        
        booking.addPayment({
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethodId || paymentData.paymentMethod,
          paymentMedium: paymentData.paymentMedium,
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          paymentType: paymentType,
          percentage: paymentData.percentage,
          notes: paymentData.notes || `Pago validado - ${paymentData.paymentMedium || paymentType}`,
          status: paymentData.status || 'PAID',
          validatedBy: validatedBy,
          validatedAt: validatedAt
        });
      }
      
      console.log(`[BookingService] ${paymentsData.length} pagos registrados desde dashboard (reemplazando existentes)`);
      
      // IMPORTANTE: NO ejecutar ninguna otra lógica de pagos
    } else if (paymentsData?.initial && paymentsData?.final) {
      // Caso: Confirmación de reserva con dos pagos (inicial + final) - formato {initial, final}
      // LIMPIAR el array de pagos existente y reemplazarlo con los nuevos
      console.log('[BookingService] Reemplazando TODOS los pagos existentes con los del dashboard (formato initial/final)');
      console.log('[BookingService] Pagos a registrar:', paymentsData);
      
      // Limpiar pagos existentes
      (booking as any)._payments = [];
      
      // Obtener el paymentMethod del booking (que ya es un ObjectId)
      const paymentMethodData = booking.toJSON().paymentMethod;
      const bookingPaymentMethodId = (paymentMethodData._id || paymentMethodData).toString();
      
      // Pago inicial
      const initialPaymentType = paymentsData.initial.paymentMethod.toLowerCase().includes('credito') || 
                                 paymentsData.initial.paymentMethod.toLowerCase().includes('debito') ? 'STRIPE' :
                                 paymentsData.initial.paymentMethod.toLowerCase().includes('efectivo') ? 'CASH' :
                                 paymentsData.initial.paymentMethod.toLowerCase().includes('transferencia') ? 'TRANSFER' : 'OTHER';
      
      booking.addPayment({
        amount: paymentsData.initial.amount,
        paymentMethod: bookingPaymentMethodId, // Usar el ObjectId del booking
        paymentMedium: paymentsData.initial.paymentMedium,
        paymentDate: paymentsData.initial.paidAt ? new Date(paymentsData.initial.paidAt) : new Date(),
        paymentType: initialPaymentType,
        percentage: paymentsData.initial.percentage,
        status: paymentsData.initial.status || 'PAID',
        notes: `Pago inicial (${paymentsData.initial.percentage}%) - ${paymentsData.initial.paymentMedium}`,
        validatedBy: validatedBy,
        validatedAt: validatedAt
      });
      
      // Pago final
      const finalPaymentType = paymentsData.final.paymentMethod.toLowerCase().includes('credito') || 
                               paymentsData.final.paymentMethod.toLowerCase().includes('debito') ? 'STRIPE' :
                               paymentsData.final.paymentMethod.toLowerCase().includes('efectivo') ? 'CASH' :
                               paymentsData.final.paymentMethod.toLowerCase().includes('transferencia') ? 'TRANSFER' : 'OTHER';
      
      booking.addPayment({
        amount: paymentsData.final.amount,
        paymentMethod: bookingPaymentMethodId, // Usar el ObjectId del booking
        paymentMedium: paymentsData.final.paymentMedium,
        paymentDate: new Date(),
        paymentType: finalPaymentType,
        percentage: paymentsData.final.percentage,
        status: paymentsData.final.status || 'PAID',
        notes: `Pago final (${paymentsData.final.percentage}%) - ${paymentsData.final.paymentMedium}`,
        validatedBy: validatedBy,
        validatedAt: validatedAt
      });
      
      console.log(`[BookingService] Pagos registrados: Inicial ${paymentsData.initial.amount} + Final ${paymentsData.final.amount}`);
    } else if (paid && paidAmount && paidAmount > 0 && !paymentsData) {
      // Caso: Pago único o validación simple SIN paymentsData
      // Solo registrar si NO vienen paymentsData para evitar duplicados
      const paymentType = paymentMethodName === 'Credito/Debito' ? 'STRIPE' : 
                         paymentMethodName === 'Efectivo' ? 'CASH' :
                         paymentMethodName === 'Transferencia' ? 'TRANSFER' : 'OTHER';
      
      booking.addPayment({
        amount: paidAmount,
        paymentMethod: paymentMethodName,
        paymentDate: new Date(),
        paymentType: paymentType,
        notes: `Pago ${wasReserve ? 'parcial (anticipo)' : 'completo'} validado`,
        status: 'PAID',
        validatedBy: validatedBy,
        validatedAt: validatedAt
      });
      
      console.log(`[BookingService] Pago registrado: ${paidAmount} MXN - ${paymentMethodName} (${paymentType})`);
    }

    // Establecer isValidated según el parámetro recibido
    if (isValidated) {
    booking.validateBooking();
    } else {
    // Si isValidated=false, establecer explícitamente el valor en el modelo
    (booking as any)._isValidated = false;
    }
    
    const updatedBooking = await this.bookingRepository.update(id, booking);
    console.log(`[BookingService] validateBooking - Después de update: isReserve=${updatedBooking.toJSON().isReserve}, totalPaid=${updatedBooking.toJSON().totalPaid}`);

    if (!updatedBooking) {
      throw new BaseErrorException('Booking not updated', HttpStatus.NOT_FOUND);
    }

    if (isManual) {
      const user = await this.bookingRepository.findUserByBookingId(id);
      email = user.toJSON().email || email;
    }

    const statusName = status.toJSON().name;
    
    // Actualizar el status del contrato asociado para mantener consistencia
    try {
      const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
      const contract = await Contract.findOne({ booking: id });
      if (contract) {
        contract.status = status.toJSON()._id;
        await contract.save();
        console.log(`[BookingService] Status del contrato ${contract._id} actualizado a ${statusName}`);
      }
    } catch (error) {
      console.error('[BookingService] Error actualizando status del contrato:', error.message);
    }
    
    // Verificar si la reserva cambió de isReserve=true a isReserve=false (pago completo)
    const updatedBookingData = updatedBooking.toJSON();
    const isNowFullyPaid = wasReserve && !updatedBookingData.isReserve;
    
    console.log(`[BookingService] validateBooking - Estado final: isReserve=${updatedBookingData.isReserve}, totalPaid=${updatedBookingData.totalPaid}`);
    console.log(`[BookingService] validateBooking - ¿Cambió de reserva a pago completo? ${isNowFullyPaid}`);
    
    // Enviar correo según el estado resultante
    // NOTA: Para Efectivo desde Web, siempre se envía email de confirmación (APPROVED)
    console.log(`[BookingService] 📊 RESULTADO FINAL RESERVA #${updatedBookingData.bookingNumber || id}`);
    console.log(`[BookingService] Status: ${statusName}`);
    console.log(`[BookingService] Paid: ${paid}`);
    console.log(`[BookingService] Total: ${updatedBookingData.total}`);
    console.log(`[BookingService] Total Pagado: ${updatedBookingData.totalPaid}`);
    console.log(`[BookingService] isReserve: ${updatedBookingData.isReserve}`);
    console.log(`[BookingService] isValidated: ${updatedBookingData.isValidated}`);
    console.log('='.repeat(80));
    
    if (statusName === TypeStatus.APPROVED) {
      // Pago aprobado - verificar si es pago completo de una reserva o pago normal
      if (isNowFullyPaid) {
        // Era una reserva y ahora está completamente pagada - enviar email de confirmación completa
        console.log(`[BookingService] 📧 RESERVA #${updatedBookingData.bookingNumber} - Enviando email de CONFIRMACIÓN COMPLETA`);
        console.log(`[BookingService] Motivo: Era reserva y ahora está completamente pagada`);
        console.log(`[BookingService] Método de pago: ${paymentMethodName}`);
        this.eventEmitter.emit('send-booking.confirmed', {
          booking: updatedBooking,
          userEmail: email,
          lang,
        });
      } else {
        // Pago normal o pago parcial - enviar email de aprobación
        // IMPORTANTE: Para pagos aprobados, enviar con isReserve=false para que use el template de confirmación
        console.log(`[BookingService] 📧 RESERVA #${updatedBookingData.bookingNumber} - Enviando email de CONFIRMACIÓN`);
        console.log(`[BookingService] Motivo: Pago aprobado`);
        console.log(`[BookingService] Método de pago: ${paymentMethodName}`);
        
        // Crear una copia del booking con isReserve=false para forzar el template de confirmación
        const bookingForConfirmation = {
          ...updatedBooking.toJSON(),
          isReserve: false
        };
        const bookingModelForConfirmation = {
          toJSON: () => bookingForConfirmation
        } as BookingModel;
        
        this.eventEmitter.emit('send-booking.created', {
          updatedBooking: bookingModelForConfirmation,
          userEmail: email,
          lang,
        });
      }

      // Crear comisiones solo si el pago fue aprobado
      try {
        const user = await this.bookingRepository.findUserByBookingId(id);
        const userId = user?.toJSON()._id?.toString?.() ?? undefined;
        const bookingJson = updatedBooking.toJSON();
        const bookingId = bookingJson._id?.toString?.() ?? id;
        const bookingNumber = bookingJson.bookingNumber;
        const conciergeId = bookingJson.concierge;

        // Verificar si ya existen comisiones para este booking
        const existing = await this.commissionRepository.findByBooking(bookingId);
        if (existing && existing.length > 0) {
          console.log(`[BookingService] Ya existen ${existing.length} comisiones para el booking ${bookingNumber}, no se crearán nuevas`);
          return updatedBooking;
        }

        // Si tiene concierge asignado, crear UNA SOLA comisión sobre el total
        if (conciergeId) {
          try {
            const concierge = await this.vehicleOwnerRepository.findById(conciergeId.toString());
            if (concierge) {
              const conciergeData = concierge.toJSON();
              const percentage = bookingJson.commission !== undefined && bookingJson.commission !== null
                ? bookingJson.commission
                : (conciergeData.commissionPercentage ?? 15);
              
              // Obtener el booking actualizado para tener el total correcto
              const currentBooking = await this.bookingRepository.findById(bookingId);
              const currentBookingData = currentBooking.toJSON();
              const bookingTotal = currentBookingData.total || 0;
              
              console.log(`[BookingService] Creando comisión única para concierge ${conciergeId} sobre total ${bookingTotal} con ${percentage}%`);
              
              const amount = Math.round((bookingTotal * (percentage / 100)) * 100) / 100;

              await this.commissionRepository.create(
                CommissionModel.create({
                  booking: bookingId as any,
                  bookingNumber: bookingNumber as any,
                  user: userId as any,
                  vehicleOwner: conciergeId as any,
                  vehicles: [], // No hay vehículos específicos, es sobre el total
                  detail: 'Comisión Concierge',
                  status: 'PENDING',
                  amount: amount as any,
                  source: 'booking' as any,
                } as any)
              );
              console.log(`[BookingService] Comisión única creada: ${amount} MXN (${percentage}% de ${bookingTotal})`);
            }
          } catch (err) {
            console.error('[BookingService] Error creating concierge commission:', err);
          }
        } 
        // Si NO tiene concierge, crear comisiones por vehículo
        else {
          const parsedCart = JSON.parse(updatedBooking.toJSON().cart || '{}');
          if (parsedCart?.vehicles && Array.isArray(parsedCart.vehicles)) {
            console.log(`[BookingService] No hay concierge, creando comisiones por vehículo`);
            for (const v of parsedCart.vehicles) {
              const vehicle = v.vehicle;
              const vehicleId = vehicle?._id;
              let ownerId = vehicle?.owner?._id;
              const vehicleTotal = v.total ?? 0;

              // Fallback: fetch vehicle to get owner if not present in cart JSON
              if (!ownerId && vehicleId) {
                try {
                  const fullVehicle = await this.vehicleRepository.findById(vehicleId);
                  ownerId = (((fullVehicle as any)?.toJSON?.() as any)?.owner as any)?._id ?? ownerId;
                } catch { }
              }

              if (ownerId && vehicleId && typeof vehicleTotal === 'number') {
                const percentage = vehicle?.owner?.commissionPercentage ?? 0;
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
        console.error('[BookingService] Error creating commissions:', e);
        // ignore commission errors
      }
    } else if (statusName === TypeStatus.PENDING) {
      // Pago pendiente - enviar correo de pendiente
      // IMPORTANTE: Para pagos pendientes, asegurarnos de que isReserve=true para que use el template de "PAGO PENDIENTE"
      console.log(`[BookingService] 📧 RESERVA #${updatedBookingData.bookingNumber} - Enviando email de PAGO PENDIENTE`);
      console.log(`[BookingService] Método de pago: ${paymentMethodName}`);
      console.log(`[BookingService] Source: ${contractSource}`);
      console.log(`[BookingService] Paid: ${paid}, isValidated: ${isValidated}`);
      
      // Determinar si es "pago no validado" (usuario navegó hacia atrás) o "pendiente común" (transferencia)
      const isPaymentNotValidated = contractSource === 'Web' && !paid && paymentMethodName === 'Credito/Debito';
      
      // Crear una copia del booking con isReserve=true y metadata adicional
      const bookingForPending = {
        ...updatedBooking.toJSON(),
        isReserve: true,
        metadata: {
          ...updatedBooking.toJSON().metadata,
          isPaymentNotValidated: isPaymentNotValidated // Flag para diferenciar en el template
        }
      };
      const bookingModelForPending = {
        toJSON: () => bookingForPending
      } as unknown as BookingModel;
      
      console.log(`[BookingService] Email destino: ${email}`);
      console.log(`[BookingService] Datos del booking:`, {
        bookingId: bookingForPending._id,
        bookingNumber: bookingForPending.bookingNumber,
        isReserve: bookingForPending.isReserve,
        total: bookingForPending.total,
        totalPaid: bookingForPending.totalPaid,
        status: bookingForPending.status?.name,
        isPaymentNotValidated: isPaymentNotValidated
      });
      
      this.eventEmitter.emit('send-booking.created', {
        updatedBooking: bookingModelForPending,
        userEmail: email,
        lang,
      });
      
      } else if (statusName === TypeStatus.REJECTED) {
      // ✅ VALIDACIÓN: Verificar que el booking no esté ya APROBADO antes de enviar email de rechazo
      // Esto previene emails contradictorios cuando se llama validateBooking múltiples veces
      const currentBookingStatus = bookingData.status?.name;
      
      if (currentBookingStatus === TypeStatus.APPROVED) {
        console.log(`[BookingService] ⚠️ RESERVA #${updatedBookingData.bookingNumber} - Email de PAGO RECHAZADO BLOQUEADO`);
        console.log(`[BookingService] Motivo: El booking ya está APROBADO, no se puede enviar email de rechazo`);
        console.log(`[BookingService] Status actual: ${currentBookingStatus}, Status nuevo: ${statusName}`);
        console.log(`[BookingService] Esto indica una posible llamada duplicada a validateBooking`);
        
        // No enviar email de rechazo, pero continuar con el resto del proceso
        return updatedBooking;
      }
      
      // Pago rechazado - establecer totalPaid en 0 antes de enviar el correo
      console.log(`[BookingService] 📧 RESERVA #${updatedBookingData.bookingNumber} - Enviando email de PAGO RECHAZADO`);
      console.log(`[BookingService] Estableciendo totalPaid en 0`);
      
      // Actualizar totalPaid a 0 en la base de datos
      await this.bookingRepository['bookingDB'].updateOne(
        { _id: id },
        { $set: { totalPaid: 0 } }
      );
      
      // Actualizar el objeto updatedBooking para reflejar el cambio
      (updatedBooking as any)._totalPaid = 0;
      
      console.log(`[BookingService] Email destino: ${email}`);
      this.eventEmitter.emit('send-booking.rejected', {
        booking: updatedBooking,
        userEmail: email,
        lang,
      });
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
    // IMPORTANTE: El email se envía ANTES de modificar totalPaid
    // para que el template pueda evaluar correctamente el estado original
    this.eventEmitter.emit('send-booking.cancelled', {
      booking: updatedBooking,
      userEmail,
      lang,
    });

    // DESPUÉS de enviar el email, establecer totalPaid en 0 SOLO para estados NO APPROVED
    const bookingData = updatedBooking.toJSON();
    const statusName = bookingData.status?.name || '';
    
    if (statusName !== TypeStatus.APPROVED) {
      console.log(`[BookingService] Reserva CANCELADA ${id} con estado ${statusName}, estableciendo totalPaid en 0`);
      
      // Actualizar totalPaid a 0 en la base de datos
      await this.bookingRepository['bookingDB'].updateOne(
        { _id: id },
        { $set: { totalPaid: 0 } }
      );
      
      // Actualizar el objeto updatedBooking para reflejar el cambio
      (updatedBooking as any)._totalPaid = 0;
      
      console.log(`[BookingService] totalPaid establecido en 0 para reserva cancelada`);
    } else {
      console.log(`[BookingService] Reserva CANCELADA ${id} con estado APPROVED, manteniendo totalPaid original: ${bookingData.totalPaid}`);
    }

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

  async exportBookings(filters: any): Promise<Buffer> {
    const XLSX = require('xlsx');
    
    console.log('[ExportBookings] Iniciando exportación...');
    const startTime = Date.now();
    
    // Obtener todas las reservas sin paginación
    const allFilters = { ...filters, page: 1, limit: 999999 };
    const result = await this.bookingRepository.findAll(allFilters);
    const bookings = result.data;
    
    console.log(`[ExportBookings] ${bookings.length} reservas obtenidas en ${Date.now() - startTime}ms`);

    // Obtener información de contratos en una sola consulta
    const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
    const bookingIds = bookings.map(b => b._id);
    const contracts = await Contract.find({ booking: { $in: bookingIds } }).lean();
    const contractsMap = new Map(contracts.map(c => [c.booking.toString(), c]));
    
    console.log(`[ExportBookings] ${contracts.length} contratos obtenidos en ${Date.now() - startTime}ms`);

    // Obtener todos los concierges únicos en una sola consulta
    const conciergeIds = [...new Set(bookings.map(b => b.concierge).filter(Boolean))];
    const concierges = await Promise.all(
      conciergeIds.map(async (id) => {
        try {
          const concierge = await this.vehicleOwnerRepository.findById(
            typeof id === 'string' ? id : id.toString()
          );
          return { id: id.toString(), name: concierge.toJSON().name };
        } catch (error) {
          return { id: id.toString(), name: '-' };
        }
      })
    );
    const conciergesMap = new Map(concierges.map(c => [c.id, c.name]));
    
    console.log(`[ExportBookings] ${concierges.length} concierges obtenidos en ${Date.now() - startTime}ms`);

    // Obtener todos los métodos de pago únicos en una sola consulta
    const paymentMethodIds = [...new Set(
      bookings.flatMap(b => 
        b.payments && Array.isArray(b.payments) 
          ? b.payments.map((p: any) => {
              if (!p.paymentMethod) return null;
              const pmValue = typeof p.paymentMethod === 'string' ? p.paymentMethod : p.paymentMethod.toString();
              // Verificar si es un ObjectId válido (24 caracteres hexadecimales)
              return /^[0-9a-fA-F]{24}$/.test(pmValue) ? pmValue : null;
            }).filter(Boolean)
          : []
      )
    )];
    
    const paymentMethods = await Promise.all(
      paymentMethodIds.map(async (id: string) => {
        try {
          const pm = await this.paymentMethodRepository.findById(id);
          return { id: id, name: pm.toJSON().name };
        } catch (error) {
          return { id: id, name: '-' };
        }
      })
    );
    const paymentMethodsMap = new Map(paymentMethods.map(pm => [pm.id, pm.name]));
    
    console.log(`[ExportBookings] ${paymentMethods.length} métodos de pago obtenidos en ${Date.now() - startTime}ms`);

    const rows = [];

    for (const booking of bookings) {
      try {
        // Parsear el cart para obtener los servicios y el hotel
        const cart = JSON.parse(booking.cart || '{}');
        
        // Obtener servicios detallados y calcular fechas globales
        const services = [];
        let globalStartDate: Date | null = null;
        let globalEndDate: Date | null = null;
        
        if (cart.vehicles && cart.vehicles.length > 0) {
        cart.vehicles.forEach((v: any) => {
        const vehicleName = v.vehicle?.name || 'Vehículo';
        const dates = v.dates ? `${new Date(v.dates.start).toLocaleDateString('es-MX', { timeZone: 'America/Cancun' })} - ${new Date(v.dates.end).toLocaleDateString('es-MX', { timeZone: 'America/Cancun' })}` : '';
        services.push(`${vehicleName} (${dates})`);
        
        // Actualizar fechas globales
        if (v.dates?.start) {
        const startDate = new Date(v.dates.start);
        if (!globalStartDate || startDate < globalStartDate) {
        globalStartDate = startDate;
        }
        }
        if (v.dates?.end) {
        const endDate = new Date(v.dates.end);
        if (!globalEndDate || endDate > globalEndDate) {
        globalEndDate = endDate;
        }
        }
        });
        }
        if (cart.transfer && cart.transfer.length > 0) {
        cart.transfer.forEach((t: any) => {
        const transferName = t.transfer?.name || 'Transfer';
        services.push(transferName);
        
        // Actualizar fechas globales con fecha del transfer
        if (t.date) {
        const transferDate = new Date(t.date);
        if (!globalStartDate || transferDate < globalStartDate) {
        globalStartDate = transferDate;
        }
        if (!globalEndDate || transferDate > globalEndDate) {
        globalEndDate = transferDate;
        }
        }
        });
        }
        if (cart.tours && cart.tours.length > 0) {
        cart.tours.forEach((t: any) => {
        const tourName = t.tour?.name || 'Tour';
        services.push(tourName);
        
        // Actualizar fechas globales con fecha del tour
        if (t.date) {
        const tourDate = new Date(t.date);
        if (!globalStartDate || tourDate < globalStartDate) {
        globalStartDate = tourDate;
        }
        if (!globalEndDate || tourDate > globalEndDate) {
        globalEndDate = tourDate;
        }
        }
        });
        }
        if (cart.tickets && cart.tickets.length > 0) {
        cart.tickets.forEach((t: any) => {
        const ticketName = t.ticket?.name || 'Ticket';
        services.push(ticketName);
        
        // Actualizar fechas globales con fecha del ticket
        if (t.date) {
        const ticketDate = new Date(t.date);
        if (!globalStartDate || ticketDate < globalStartDate) {
        globalStartDate = ticketDate;
        }
        if (!globalEndDate || ticketDate > globalEndDate) {
        globalEndDate = ticketDate;
        }
        }
        });
        }

        // Obtener hotel del cliente - solo desde metadata.hotel
        let hotel = '-';
        if (booking.metadata && booking.metadata.hotel) {
          hotel = booking.metadata.hotel;
        }

        // Obtener concierge desde el mapa
        let conciergeName = '-';
        if ((booking as any).conciergeName) {
          conciergeName = (booking as any).conciergeName;
        } else if (booking.concierge) {
          const conciergeId = typeof booking.concierge === 'string' ? booking.concierge : booking.concierge.toString();
          conciergeName = conciergesMap.get(conciergeId) || '-';
        }

        // Obtener monto de extensión del contrato desde el mapa
        let extensionAmount = 0;
        const contract = contractsMap.get(booking._id.toString());
        if (contract && (contract as any).extension) {
          extensionAmount = (contract as any).extension.extensionAmount || 0;
        }

        // Obtener medio de pago desde metadata
        let paymentMedium = '-';
        if (booking.metadata && booking.metadata.paymentMedium) {
          paymentMedium = booking.metadata.paymentMedium;
        } else if ((booking as any).paymentMedium) {
          paymentMedium = (booking as any).paymentMedium;
        }

        // Calcular total general (total + extensión si existe)
        const totalGeneral = (booking.total || 0) + extensionAmount;

        // Extraer información de pagos individuales
        const payment1 = booking.payments && booking.payments[0] ? booking.payments[0] : null;
        const payment2 = booking.payments && booking.payments[1] ? booking.payments[1] : null;
        
        // Obtener nombres de métodos de pago desde el mapa o directamente si es string
        const payment1MethodName = payment1 && payment1.paymentMethod 
          ? (() => {
              const pmValue = typeof payment1.paymentMethod === 'string' ? payment1.paymentMethod : payment1.paymentMethod.toString();
              // Si es un ObjectId válido, buscar en el mapa; si no, es el nombre directo
              return /^[0-9a-fA-F]{24}$/.test(pmValue) ? (paymentMethodsMap.get(pmValue) || '-') : pmValue;
            })()
          : '-';
        const payment2MethodName = payment2 && payment2.paymentMethod 
          ? (() => {
              const pmValue = typeof payment2.paymentMethod === 'string' ? payment2.paymentMethod : payment2.paymentMethod.toString();
              // Si es un ObjectId válido, buscar en el mapa; si no, es el nombre directo
              return /^[0-9a-fA-F]{24}$/.test(pmValue) ? (paymentMethodsMap.get(pmValue) || '-') : pmValue;
            })()
          : '-'

        const row = {
          'ID': booking._id?.toString() || 'N/A',
          'Número de Reserva': booking.bookingNumber || 'N/A',
          'Fecha de Creación': booking.createdAt ? new Date(booking.createdAt).toLocaleString('es-MX', { timeZone: 'America/Cancun', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
          'Inicio de Renta': globalStartDate ? globalStartDate.toLocaleString('es-MX', { timeZone: 'America/Cancun', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
          'Fin de Renta': globalEndDate ? globalEndDate.toLocaleString('es-MX', { timeZone: 'America/Cancun', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
          'Servicios': services.join('\n') || 'N/A',
          'Nombre Cliente': booking.userContact ? `${booking.userContact.name || ''} ${booking.userContact.lastName || ''}`.trim() : 'N/A',
          'Email Cliente': booking.userContact?.email || 'N/A',
          'Teléfono Cliente': booking.userContact?.cellphone || 'N/A',
          'Total Inicial': booking.total || 0,
          'Total General': totalGeneral,
          'Total Pagado': booking.totalPaid || 0,
          'Método de Pago': booking.paymentMethod?.name || 'N/A',
          'Medio de Pago': paymentMedium,
          'Pago 1 - Monto': payment1 ? payment1.amount || 0 : '-',
          'Pago 1 - Medio': payment1 ? payment1.paymentMedium || '-' : '-',
          'Pago 1 - Método': payment1MethodName,
          'Pago 2 - Monto': payment2 ? payment2.amount || 0 : '-',
          'Pago 2 - Medio': payment2 ? payment2.paymentMedium || '-' : '-',
          'Pago 2 - Método': payment2MethodName,
          'Estado': booking.status?.name || 'N/A',
          'Hotel': hotel,
          'Concierge': conciergeName
        };

        rows.push(row);
      } catch (error) {
        console.error('Error procesando booking:', booking.bookingNumber, error);
      }
    }
    
    console.log(`[ExportBookings] ${rows.length} filas procesadas en ${Date.now() - startTime}ms`);

    // Crear el libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Ajustar el ancho de las columnas
    const columnWidths = [
    { wch: 25 }, // ID
    { wch: 18 }, // Número de Reserva
    { wch: 20 }, // Fecha de Creaci��n
    { wch: 20 }, // Inicio de Renta
    { wch: 20 }, // Fin de Renta
    { wch: 40 }, // Servicios
    { wch: 25 }, // Nombre Cliente
    { wch: 30 }, // Email Cliente
    { wch: 18 }, // Teléfono Cliente
    { wch: 15 }, // Total Inicial
    { wch: 15 }, // Total General
    { wch: 15 }, // Total Pagado
    { wch: 18 }, // Método de Pago
    { wch: 18 }, // Medio de Pago
    { wch: 15 }, // Pago 1 - Monto
        { wch: 15 }, // Pago 1 - Medio
        { wch: 15 }, // Pago 1 - Método
        { wch: 15 }, // Pago 2 - Monto
        { wch: 15 }, // Pago 2 - Medio
        { wch: 15 }, // Pago 2 - Método
    { wch: 15 }, // Estado
    { wch: 20 }, // Hotel
    { wch: 20 }  // Concierge
    ];
    worksheet['!cols'] = columnWidths;
    
    // Habilitar wrap text para las columnas de servicios y detalle de pagos
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
    // Columna F (Servicios)
    const servicesCell = XLSX.utils.encode_cell({ r: R, c: 5 });
    if (worksheet[servicesCell]) {
    if (!worksheet[servicesCell].s) worksheet[servicesCell].s = {};
    worksheet[servicesCell].s.alignment = { wrapText: true, vertical: 'top' };
    }
    
    // Columna O (Detalle de Pagos)
    const paymentsCell = XLSX.utils.encode_cell({ r: R, c: 14 });
    if (worksheet[paymentsCell]) {
    if (!worksheet[paymentsCell].s) worksheet[paymentsCell].s = {};
    worksheet[paymentsCell].s.alignment = { wrapText: true, vertical: 'top' };
    }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');

    // Generar el buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return excelBuffer;
  }

  async exportBookingsSimple(filters: any): Promise<Buffer> {
  const XLSX = require('xlsx');
  
  console.log('[ExportBookingsSimple] Iniciando exportación simplificada...');
  const startTime = Date.now();
  
  // Obtener todas las reservas sin paginación
  const allFilters = { ...filters, page: 1, limit: 999999 };
  const result = await this.bookingRepository.findAll(allFilters);
  const bookings = result.data;
  
  console.log(`[ExportBookingsSimple] ${bookings.length} reservas obtenidas en ${Date.now() - startTime}ms`);
  
  // Obtener información de contratos en una sola consulta con populate de reservingUser
  const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
  const bookingIds = bookings.map(b => b._id);
  const contracts = await Contract.find({ booking: { $in: bookingIds } })
  .populate('reservingUser')
  .lean();
  const contractsMap = new Map(contracts.map(c => [c.booking.toString(), c]));
    
    console.log(`[ExportBookingsSimple] ${contracts.length} contratos obtenidos en ${Date.now() - startTime}ms`);

    // Obtener todos los concierges únicos en una sola consulta
    const conciergeIds = [...new Set(bookings.map(b => b.concierge).filter(Boolean))];
    const concierges = await Promise.all(
      conciergeIds.map(async (id) => {
        try {
          const concierge = await this.vehicleOwnerRepository.findById(
            typeof id === 'string' ? id : id.toString()
          );
          return { id: id.toString(), name: concierge.toJSON().name };
        } catch (error) {
          return { id: id.toString(), name: '-' };
        }
      })
    );
    const conciergesMap = new Map(concierges.map(c => [c.id, c.name]));
    
    console.log(`[ExportBookingsSimple] ${concierges.length} concierges obtenidos en ${Date.now() - startTime}ms`);

    const rows = [];

    for (const booking of bookings) {
      try {
        // Parsear el cart para obtener los servicios
        const cart = JSON.parse(booking.cart || '{}');
        
        // Obtener servicios simplificados
        const services = [];
        
        if (cart.vehicles && cart.vehicles.length > 0) {
          cart.vehicles.forEach((v: any) => {
            const vehicleName = v.vehicle?.name || 'Vehículo';
            services.push(vehicleName);
          });
        }
        if (cart.transfer && cart.transfer.length > 0) {
          cart.transfer.forEach((t: any) => {
            const transferName = t.transfer?.name || 'Transfer';
            services.push(transferName);
          });
        }
        if (cart.tours && cart.tours.length > 0) {
          cart.tours.forEach((t: any) => {
            const tourName = t.tour?.name || 'Tour';
            services.push(tourName);
          });
        }
        if (cart.tickets && cart.tickets.length > 0) {
          cart.tickets.forEach((t: any) => {
            const ticketName = t.ticket?.name || 'Ticket';
            services.push(ticketName);
          });
        }

        // Obtener hotel del cliente - solo desde metadata.hotel
        let hotel = '-';
        if (booking.metadata && booking.metadata.hotel) {
          hotel = booking.metadata.hotel;
        }

        // Obtener concierge desde el mapa
        let conciergeName = '-';
        if ((booking as any).conciergeName) {
          conciergeName = (booking as any).conciergeName;
        } else if (booking.concierge) {
          const conciergeId = typeof booking.concierge === 'string' ? booking.concierge : booking.concierge.toString();
          conciergeName = conciergesMap.get(conciergeId) || '-';
        }

        // Obtener monto de extensión del contrato desde el mapa
        let extensionAmount = 0;
        const contract = contractsMap.get(booking._id.toString());
        if (contract && (contract as any).extension) {
        extensionAmount = (contract as any).extension.extensionAmount || 0;
        }
        
        // Obtener medio de pago desde metadata
        let paymentMedium = '-';
        if (booking.metadata && booking.metadata.paymentMedium) {
        paymentMedium = booking.metadata.paymentMedium;
        } else if ((booking as any).paymentMedium) {
        paymentMedium = (booking as any).paymentMedium;
        }
        
        // Calcular total general (total + extensión si existe)
        const totalGeneral = (booking.total || 0) + extensionAmount;
        
        // Obtener información del cliente desde el contrato (con type assertion)
        const reservingUser = (contract as any)?.reservingUser;
        const clientName = reservingUser ? `${reservingUser.name || ''} ${reservingUser.lastName || ''}`.trim() : '-';
        const clientEmail = reservingUser?.email || '-';
        const clientPhone = reservingUser?.cellphone || '-';
          
          // Crear fila simplificada
          rows.push({
          'N° Reserva': booking.bookingNumber || '-',
          'Estado': booking.status?.name || '-',
          'Método de Pago': booking.paymentMethod?.name || '-',
          'Medio de Pago': paymentMedium,
          'Total Inicial': booking.total || 0,
          'Total General': totalGeneral,
          'Servicios': services.join(', ') || '-',
          'Fecha de Creación': booking.createdAt
          ? new Date(booking.createdAt).toLocaleDateString('es-MX', { timeZone: 'America/Cancun' })
          : '-',
          'Hotel': hotel,
          'Nombre Cliente': clientName,
          'Email Cliente': clientEmail,
          'Teléfono Cliente': clientPhone,
          'Concierge': conciergeName
          });
      } catch (error) {
        console.error(`[ExportBookingsSimple] Error procesando booking ${booking._id}:`, error);
        // Continuar con el siguiente booking
      }
    }

    console.log(`[ExportBookingsSimple] ${rows.length} filas procesadas en ${Date.now() - startTime}ms`);

    // Crear el libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');

    // Generar el buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log(`[ExportBookingsSimple] Exportación completada en ${Date.now() - startTime}ms`);

    return excelBuffer;
  }

  async exportBookingMovements(filters: any): Promise<Buffer> {
    const XLSX = require('xlsx');
    
    console.log('[ExportMovements] Iniciando exportación de movimientos...');
    const startTime = Date.now();
    
    // Obtener todas las reservas con sus contratos
    const allFilters = { ...filters, page: 1, limit: 999999 };
    const result = await this.bookingRepository.findAll(allFilters);
    const bookings = result.data;
    
    console.log(`[ExportMovements] ${bookings.length} reservas obtenidas en ${Date.now() - startTime}ms`);

    // Obtener todos los contratos con sus movimientos desde el timeline
    const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
    const ContractHistory = this.bookingRepository['bookingDB'].db.model('ContractHistory');
    
    const bookingIds = bookings.map(b => b._id);
    const contracts = await Contract.find({ booking: { $in: bookingIds } }).lean();
    
    console.log(`[ExportMovements] ${contracts.length} contratos obtenidos`);
    
    // Obtener el timeline (historial) de cada contrato
    const contractIds = contracts.map(c => c._id);
    const timelineEntries = await ContractHistory.find({
    contract: { $in: contractIds },
    isDeleted: { $ne: true },
    action: 'NOTE_ADDED', // Solo las notas que representan movimientos
    eventType: { $exists: true, $ne: null }
    })
    .populate('eventType')
    .lean();
    
    console.log(`[ExportMovements] ${timelineEntries.length} entradas de timeline obtenidas`);
    
    // Obtener todos los métodos de pago únicos de los movimientos
    const movementPaymentMethodIds = [...new Set(
    timelineEntries
    .map((entry: any) => entry.eventMetadata?.paymentMethod)
    .filter(pm => pm && /^[0-9a-fA-F]{24}$/.test(pm.toString()))
    )];
    
    const movementPaymentMethods = await Promise.all(
    movementPaymentMethodIds.map(async (id: any) => {
    try {
    const pm = await this.paymentMethodRepository.findById(id.toString());
    return { id: id.toString(), name: pm.toJSON().name };
    } catch (error) {
    return { id: id.toString(), name: '-' };
    }
    })
    );
    const movementPaymentMethodsMap = new Map(movementPaymentMethods.map(pm => [pm.id, pm.name]));
    
    console.log(`[ExportMovements] ${movementPaymentMethods.length} métodos de pago de movimientos obtenidos`);
    
    // Crear un mapa de contratos por booking
    const contractsMap = new Map(contracts.map(c => [c.booking.toString(), c]));
    
    // Crear un mapa de movimientos por contrato desde el timeline
    const movementsMap = new Map();
    timelineEntries.forEach((entry: any) => {
    const contractId = entry.contract.toString();
    if (!movementsMap.has(contractId)) {
    movementsMap.set(contractId, []);
    }
    
    // Obtener el nombre del método de pago
    const paymentMethodId = entry.eventMetadata?.paymentMethod;
    let paymentMethodName = '-';
    if (paymentMethodId && /^[0-9a-fA-F]{24}$/.test(paymentMethodId.toString())) {
    paymentMethodName = movementPaymentMethodsMap.get(paymentMethodId.toString()) || paymentMethodId.toString();
    }
    
    // Transformar la entrada del timeline a formato de movimiento
    const movement = {
    type: entry.eventType?.name || entry.details || 'Movimiento',
    amount: entry.eventMetadata?.amount || 0,
    paymentMethod: paymentMethodName,
    paymentMedium: entry.eventMetadata?.paymentMedium || '-',
    date: entry.createdAt,
    detail: entry.details || '-'
    };
    
    movementsMap.get(contractId).push(movement);
    });
    
    const rows = [];
    
    // Procesar cada booking y sus movimientos
    for (const booking of bookings) {
    const contract = contractsMap.get(booking._id.toString());
    if (!contract) continue;
    
    const contractMovements = movementsMap.get((contract as any)._id.toString()) || [];
      
      // Si no hay movimientos, agregar una fila con la info básica
      if (contractMovements.length === 0) {
        rows.push({
          'Número de Reserva': booking.bookingNumber || 'N/A',
          'Fecha de Creación': booking.createdAt ? new Date(booking.createdAt).toLocaleString('es-MX', { timeZone: 'America/Cancun', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
          'Cliente': booking.userContact ? `${booking.userContact.name || ''} ${booking.userContact.lastName || ''}`.trim() : 'N/A',
          'Total Reserva': booking.total || 0,
          'Estado Reserva': booking.status?.name || 'N/A',
          'Tipo de Movimiento': '-',
          'Monto': 0,
          'Medio de Pago': '-',
          'Método de Pago': '-',
          'Fecha Movimiento': '-',
          'Detalle': 'Sin movimientos registrados'
        });
      } else {
        // Agregar una fila por cada movimiento
        for (const movement of contractMovements) {
          rows.push({
            'Número de Reserva': booking.bookingNumber || 'N/A',
            'Fecha de Creación': booking.createdAt ? new Date(booking.createdAt).toLocaleString('es-MX', { timeZone: 'America/Cancun', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
            'Cliente': booking.userContact ? `${booking.userContact.name || ''} ${booking.userContact.lastName || ''}`.trim() : 'N/A',
            'Total Reserva': booking.total || 0,
            'Estado Reserva': booking.status?.name || 'N/A',
            'Tipo de Movimiento': movement.type || '-',
            'Monto': movement.amount || 0,
            'Medio de Pago': movement.paymentMedium || '-',
            'Método de Pago': movement.paymentMethod || '-',
            'Fecha Movimiento': movement.date ? new Date(movement.date).toLocaleString('es-MX', { timeZone: 'America/Cancun', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
            'Detalle': movement.detail || '-'
          });
        }
      }
    }
    
    console.log(`[ExportMovements] ${rows.length} filas procesadas en ${Date.now() - startTime}ms`);
    
    // Crear el worksheet y workbook
    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Ajustar el ancho de las columnas
    const columnWidths = [
      { wch: 18 }, // Número de Reserva
      { wch: 20 }, // Fecha de Creación
      { wch: 25 }, // Cliente
      { wch: 15 }, // Total Reserva
      { wch: 15 }, // Estado Reserva
      { wch: 30 }, // Tipo de Movimiento
      { wch: 12 }, // Dirección
      { wch: 15 }, // Monto
      { wch: 20 }, // Método de Pago
      { wch: 20 }, // Fecha Movimiento
      { wch: 40 }  // Detalle
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
    
    // Generar el buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return excelBuffer;
  }

}










