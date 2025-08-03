import { ICreateAddress } from './address.type';

export interface IUserCreate {
  email: string;
  password: string;
  newsletter: boolean;
  role?: string;
  address: ICreateAddress;
}

export interface IAutoCreate {
  email: string;
  role?: string;
}

export interface IUserUpdate {
  name?: string;
  lastName?: string;
  email?: string;
  password?: string;
  cellphone?: string;
  isActive?: boolean;
  newsletter?: boolean;
  address?: ICreateAddress;
}
