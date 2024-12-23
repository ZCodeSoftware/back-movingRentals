import { BookingModel } from "../models/booking.model";
import { ICreateBooking } from "../types/booking.type";

export interface IBookingService {
    create(booking: ICreateBooking, id: string): Promise<BookingModel>
    findById(id: string): Promise<BookingModel>;
    findAll(): Promise<BookingModel[]>;
    findByUserId(userId: string): Promise<BookingModel[]>
}
