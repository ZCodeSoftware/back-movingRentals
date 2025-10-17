import { BookingModel } from '../models/booking.model';

export interface IPaginatedBookingResponse {
  data: any;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IBookingRepository {
  create(booking: BookingModel, userId: string): Promise<BookingModel>;
  findById(id: string): Promise<BookingModel>;
  findAll(filters: any): Promise<any>;
  findByUserId(userId: string): Promise<BookingModel[]>;
  findUserByBookingId(bookingId: string): Promise<any>;
  update(
    id: string,
    booking: Partial<BookingModel>,
  ): Promise<BookingModel>;
  removeFields(id: string, fields: string[]): Promise<void>;
}
