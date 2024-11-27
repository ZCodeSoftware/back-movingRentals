import * as bcrypt from 'bcrypt';
import { UserModel as AuthUserModel } from '../../../auth/domain/models/user.model';
import { UserModel } from '../../../user/domain/models/user.model';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  user: UserModel | AuthUserModel,
): Promise<boolean> => {
  return await bcrypt.compare(password, user.toJSON().password);
};
