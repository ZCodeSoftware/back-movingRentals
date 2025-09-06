import { BookingModel } from '../../../booking/domain/models/booking.model';

export interface IAdminEmailAdapter {
  reservationAdminEmail(email: string, adminName: string): Promise<any>;
  sendAdminBookingCreated(booking: BookingModel): Promise<any>;
  sendAdminBookingCancelled(booking: BookingModel): Promise<any>;
}
