import { UserModel } from '../models/user.model';

export interface IUserRepository {
  findById(id: string): Promise<UserModel>;
  addBookingInUser(userId: string, user: UserModel): Promise<UserModel>;
}
