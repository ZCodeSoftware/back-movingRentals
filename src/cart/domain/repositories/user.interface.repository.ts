import { UserModel } from '../models/user.model';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserModel>;
}
