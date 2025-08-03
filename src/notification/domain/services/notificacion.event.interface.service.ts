import { BookingModel } from '../../../booking/domain/models/booking.model';

export interface INotificationEventService {
  reservationUserEmail(email: string, name: string): Promise<any>;
  reservationAdminEmail(email: string, adminName: string): Promise<any>;
  sendBookingCreated(booking: BookingModel, userEmail: string, lang: string): Promise<any>;
  sendUserForgotPassword(email: string, token: string, frontendHost: string): Promise<any>
  sendUserAutoCreate(email: string, password: string, frontendHost: string, lang: string): Promise<any>
}
