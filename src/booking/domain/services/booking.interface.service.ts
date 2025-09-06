import { CreateBookingDTO } from '../../infrastructure/nest/dtos/booking.dto';
import { BookingModel } from '../models/booking.model';
import { ICreateBooking } from '../types/booking.type';

export interface IBookingService {
  create(booking: ICreateBooking, id: string): Promise<BookingModel>;
  addManualBookingInUser(
    booking: ICreateBooking,
    email: string,
  ): Promise<BookingModel>;
  addManualBookingInUserFromCart(
    email: string,
    body: Partial<CreateBookingDTO>,
    lang: string,
  ): Promise<BookingModel>;
  findById(id: string): Promise<BookingModel>;
  findAll(filters: any): Promise<any>;
  findByUserId(userId: string): Promise<BookingModel[]>;
  findUserByBookingId(bookingId: string): Promise<any>;
  update(id: string, booking: Partial<ICreateBooking>): Promise<BookingModel>;
  validateBooking(
    id: string,
    paid: boolean,
    email: string,
    lang: string,
    isManual?: boolean,
    isValidated?: boolean,
  ): Promise<BookingModel>;
  cancelBooking(
    id: string,
    email: string,
    lang?: string,
  ): Promise<BookingModel>;
}
