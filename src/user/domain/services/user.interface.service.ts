import { UserModel } from '../models/user.model';
import { IAutoCreate, IUserCreate, IUserUpdate } from '../types/user.type';

export interface IUserService {
  create(user: IUserCreate): Promise<UserModel>;
  autoCreate(user: IAutoCreate, frontendHost: string, lang: string): Promise<UserModel>
  findAll(filters: any): Promise<{
    data: UserModel[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>;
  findByEmail(email: string): Promise<UserModel>;
  findById(id: string): Promise<UserModel>;
  update(id: string, user: IUserUpdate): Promise<UserModel>;
  forgotPassword(email: string, requestHost: string): Promise<any>
}
