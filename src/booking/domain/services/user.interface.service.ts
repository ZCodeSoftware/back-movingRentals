import { UserModel } from '../models/user.model';
import { IUserBooking } from '../types/user.type';

export interface IUserService {
  addBookingInUser(userId: string, bookings: IUserBooking): Promise<UserModel>;
}
