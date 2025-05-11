import { BookingModel } from '../models/booking.model';

export interface IBookingRepository {
  create(booking: BookingModel, userId: string): Promise<BookingModel>;
  findById(id: string): Promise<BookingModel>;
  findAll(): Promise<BookingModel[]>;
  findByUserId(userId: string): Promise<BookingModel[]>
  update(
    id: string,
    booking: Partial<BookingModel>,
  ): Promise<BookingModel>;
}
