import {
  Company,
  CompanySchema,
} from '../../../../core/infrastructure/mongo/schemas/public/company.schema';
import {
  User,
  UserSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/user.schema';

export const companySchema = {
  name: Company.name,
  schema: CompanySchema,
};

export const userSchema = {
  name: User.name,
  schema: UserSchema,
};
