import { UserModel } from '../models/user.model';

export interface IUserRepository {
  create(user: UserModel, role: string): Promise<UserModel>;
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
  findAllNonUsers(filters: any): Promise<{
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
  findAllOnlyUsers(filters: any): Promise<{
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
  update(id: string, user: UserModel): Promise<UserModel>;
  softDelete(id: string): Promise<void>;
}
