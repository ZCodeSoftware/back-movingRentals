import { BookingModel } from '../models/booking.model';

export interface IBookingRepository {
  create(booking: BookingModel): Promise<BookingModel>;
  findById(id: string): Promise<BookingModel>;
  findAll(): Promise<BookingModel[]>;
}
