import {
  CatCategory,
  CatCategorySchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import {
  CatCountry,
  CatCountrySchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-country.schema';
import {
  CatDocument,
  CatDocumentSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-document.schema';
import { CatModel, CatModelSchema } from '../../../core/infrastructure/mongo/schemas/catalogs/cat-model.schema';
import {
  CatPaymentMethod,
  CatPaymentMethodSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-payment-method.schema';
import {
  CatPriceCondition,
  CatPriceConditionSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-price-condition.schema';
import {
  CatRole,
  CatRoleSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-role.schema';
import { CatStatus, CatStatusSchema } from '../../../core/infrastructure/mongo/schemas/catalogs/cat-status.schema';
import {
  Address,
  AddressSchema,
} from '../../../core/infrastructure/mongo/schemas/public/address.schema';
import {
  Cart,
  CartSchema,
} from '../../../core/infrastructure/mongo/schemas/public/cart.schema';
import {
  User,
  UserSchema,
} from '../../../core/infrastructure/mongo/schemas/public/user.schema';

export const roleSchema = {
  name: CatRole.name,
  schema: CatRoleSchema,
};

export const documentSchema = {
  name: CatDocument.name,
  schema: CatDocumentSchema,
};

export const categorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
};

export const priceConditionSchema = {
  name: CatPriceCondition.name,
  schema: CatPriceConditionSchema,
};

export const paymentMethodSchema = {
  name: CatPaymentMethod.name,
  schema: CatPaymentMethodSchema,
};

export const userSchema = { name: User.name, schema: UserSchema };

export const cartSchema = {
  name: Cart.name,
  schema: CartSchema,
};

export const countrySchema = {
  name: CatCountry.name,
  schema: CatCountrySchema,
};

export const addressSchema = {
  name: Address.name,
  schema: AddressSchema,
};

export const catModelSchema = {
  name: CatModel.name,
  schema: CatModelSchema,
}

export const catStatusSchema = {
  name: CatStatus.name,
  schema: CatStatusSchema,
}