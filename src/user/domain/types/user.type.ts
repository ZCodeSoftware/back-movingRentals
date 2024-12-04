export interface IUserCreate {
  email: string;
  password: string;
  newsletter: boolean;
}

export interface IUserUpdate {
  name?: string;
  lastName?: string;
  email?: string;
  password?: string;
  cellphone?: string;
  isActive?: boolean;
  newsletter?: boolean;
}
