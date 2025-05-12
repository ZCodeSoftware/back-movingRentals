import { BookingModel } from '../models/booking.model';
import { ICreateBooking } from '../types/booking.type';

export interface IBookingService {
  create(
    booking: ICreateBooking,
    id: string,
    email: string,
  ): Promise<BookingModel>;
  findById(id: string): Promise<BookingModel>;
  findAll(): Promise<BookingModel[]>;
  findByUserId(userId: string): Promise<BookingModel[]>;
  update(
    id: string,
    booking: Partial<ICreateBooking>,
  ): Promise<BookingModel>;
  validateBooking(
    id: string,
    paid: boolean,
  ): Promise<BookingModel>;
}
