import {
  CatCategory,
  CatCategorySchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import {
  CatDocument,
  CatDocumentSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-document.schema';
import {
  CatRole,
  CatRoleSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-role.schema';

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
