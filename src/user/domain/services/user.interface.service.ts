import { UserModel } from '../models/user.model';
import { IUserCreate, IUserUpdate } from '../types/user.type';

export interface IUserService {
  create(user: IUserCreate): Promise<UserModel>;
  findByEmail(email: string): Promise<UserModel>;
  findById(id: string): Promise<UserModel>;
  update(id: string, user: IUserUpdate): Promise<UserModel>;
  forgotPassword(email: string, requestHost: string): Promise<any>
}
