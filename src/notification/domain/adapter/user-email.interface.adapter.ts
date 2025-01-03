import { BookingModel } from '../../../booking/domain/models/booking.model';
import { ContactUserDto } from '../../infrastructure/nest/dto/notifications.dto';

export interface IUserEmailAdapter {
  reservationUserEmail(email: string, name: string): Promise<any>;
  sendContactUserEmail(data: ContactUserDto): Promise<any>;
  sendUserBookingCreated(
    booking: BookingModel,
    userEmail: string,
  ): Promise<any>;
}
