import { BookingModel } from '../models/booking.model';

export interface IPaginatedBookingResponse {
  data: BookingModel[];
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
  findAll(filters: any): Promise<IPaginatedBookingResponse>;
  findByUserId(userId: string): Promise<BookingModel[]>
  update(
    id: string,
    booking: Partial<BookingModel>,
  ): Promise<BookingModel>;
}
