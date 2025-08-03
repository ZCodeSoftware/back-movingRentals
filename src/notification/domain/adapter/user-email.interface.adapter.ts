import { BookingModel } from '../../../booking/domain/models/booking.model';
import { ContactUserDto } from '../../infrastructure/nest/dto/notifications.dto';

export interface IUserEmailAdapter {
  reservationUserEmail(email: string, name: string): Promise<any>;
  sendContactUserEmail(data: ContactUserDto): Promise<any>;
  sendUserBookingCreated(
    booking: BookingModel,
    userEmail: string,
    lang: string,
  ): Promise<any>;
  sendUserForgotPassword(email: string, token: string, frontendHost: string): Promise<any>
  sendUserAutoCreate(email: string, password: string, frontendHost: string, lang?: string): Promise<any>
}
