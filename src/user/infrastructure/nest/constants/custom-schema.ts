import {
  CatCountry,
  CatCountrySchema,
} from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-country.schema';
import {
  CatRole,
  CatRoleSchema,
} from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-role.schema';
import {
  Address,
  AddressSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/address.schema';
import {
  Cart,
  CartSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import {
  User,
  UserSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/user.schema';

export const userSchema = {
  name: User.name,
  schema: UserSchema,
};

export const roleSchema = {
  name: CatRole.name,
  schema: CatRoleSchema,
};

export const cartSchema = {
  name: Cart.name,
  schema: CartSchema,
};

export const addressSchema = {
  name: Address.name,
  schema: AddressSchema,
};

export const countrySchema = {
  name: CatCountry.name,
  schema: CatCountrySchema,
};
