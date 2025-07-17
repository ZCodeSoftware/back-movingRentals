import { BookingModel } from '../models/booking.model';
import { IPaginatedBookingResponse } from '../repositories/booking.interface.repository';
import { ICreateBooking } from '../types/booking.type';

export interface IBookingService {
  create(
    booking: ICreateBooking,
    id: string,
  ): Promise<BookingModel>;
  findById(id: string): Promise<BookingModel>;
  findAll(filters: any): Promise<IPaginatedBookingResponse>;
  findByUserId(userId: string): Promise<BookingModel[]>;
  findUserByBookingId(bookingId: string): Promise<any>;
  update(
    id: string,
    booking: Partial<ICreateBooking>,
  ): Promise<BookingModel>;
  validateBooking(
    id: string,
    paid: boolean,
    email: string,
    lang: string,
    isManual?: boolean,
  ): Promise<BookingModel>;
}