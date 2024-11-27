import {
  CatCategory,
  CatCategorySchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import {
  CatDocument,
  CatDocumentSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-document.schema';
import {
  CatPriceCondition,
  CatPriceConditionSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-price-condition.schema';
import {
  CatRole,
  CatRoleSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-role.schema';
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

export const userSchema = { name: User.name, schema: UserSchema };
