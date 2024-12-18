import { BookingModel } from "../models/booking.model";
import { ICreateBooking } from "../types/booking.type";

export interface IBookingService {
    create(booking: ICreateBooking): Promise<BookingModel>;
    findById(id: string): Promise<BookingModel>;
    findAll(): Promise<BookingModel[]>;
}
