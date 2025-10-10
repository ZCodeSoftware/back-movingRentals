import { BookingModel } from '../../../booking/domain/models/booking.model';

export interface IAdminEmailAdapter {
  reservationAdminEmail(email: string, adminName: string): Promise<any>;
  sendAdminBookingCreated(booking: BookingModel, userData?: any): Promise<any>;
  sendAdminBookingCancelled(booking: BookingModel): Promise<any>;
}
