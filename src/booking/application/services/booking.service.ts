import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import { TypeStatus } from '../../../core/domain/enums/type-status.enum';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import { BookingModel } from '../../domain/models/booking.model';
import { IBookingRepository } from '../../domain/repositories/booking.interface.repository';
import { ICatPaymentMethodRepository } from '../../domain/repositories/cat-payment-method.interface.repository';
import { ICatStatusRepository } from '../../domain/repositories/cat-status.interface.repostory';
import { IBookingService } from '../../domain/services/booking.interface.service';
import { ICreateBooking } from '../../domain/types/booking.type';
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

    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(
    booking: ICreateBooking,
    id: string,
  ): Promise<BookingModel> {
    const { paymentMethod, ...res } = booking;
    const bookingModel = BookingModel.create(res);

    const catPaymentMethod = await this.paymentMethodRepository.findById(paymentMethod);

    if (!catPaymentMethod) {
      throw new BaseErrorException(
        'CatPaymentMethod not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const status = await this.catStatusRepository.getStatusByName(TypeStatus.PENDING);

    if (!status) {
      throw new BaseErrorException(
        'CatStatus not found',
        HttpStatus.NOT_FOUND,
      );
    }

    bookingModel.addStatus(status);

    bookingModel.addPaymentMethod(catPaymentMethod);

    const bookingSave = await this.bookingRepository.create(bookingModel, id);

    return bookingSave;
  }

  async findById(id: string): Promise<BookingModel> {
    return this.bookingRepository.findById(id);
  }

  async findAll(filters: any): Promise<any> {
    const res = await this.bookingRepository.findAll(filters);
    return res
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

    const catPaymentMethod = await this.paymentMethodRepository.findById(paymentMethod);

    if (catPaymentMethod) bookingModel.addPaymentMethod(catPaymentMethod);

    return this.bookingRepository.update(id, bookingModel);
  }

  async validateBooking(
    id: string,
    paid: boolean,
    email: string,
    lang: string = 'es',
    isManual: boolean = false,
  ): Promise<BookingModel> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
    }

    const status = await this.catStatusRepository.getStatusByName(
      paid ? TypeStatus.APPROVED : TypeStatus.REJECTED,
    );

    if (!status) {
      throw new BaseErrorException('CatStatus not found', HttpStatus.NOT_FOUND);
    }

    booking.addStatus(status);

    booking.payBooking(paid);

    const updatedBooking = await this.bookingRepository.update(id, booking);

    if (!updatedBooking) {
      throw new BaseErrorException('Booking not updated', HttpStatus.NOT_FOUND);
    }

    if (isManual) {
      const user = await this.bookingRepository.findUserByBookingId(id);
      email = user.toJSON().email || email;
    }

    if (status.toJSON().name === TypeStatus.APPROVED) {
      this.eventEmitter.emit('send-booking.created', {
        updatedBooking,
        userEmail: email,
        lang,
      });
    }

    return updatedBooking
  }
}