import { UserModel } from '../models/user.model';

export interface IUserRepository {
  findById(id: string): Promise<UserModel>;
}
