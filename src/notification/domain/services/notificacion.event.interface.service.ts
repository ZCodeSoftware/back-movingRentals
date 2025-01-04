import { BookingModel } from '../../../booking/domain/models/booking.model';

export interface INotificationEventService {
  reservationUserEmail(email: string, name: string): Promise<any>;
  reservationAdminEmail(email: string, adminName: string): Promise<any>;
  sendBookingCreated(booking: BookingModel, userEmail: string): Promise<any>;
}
