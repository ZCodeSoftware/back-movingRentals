import { CatCategory, CatCategorySchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { Transfer, TransferSchema } from '../../../../core/infrastructure/mongo/schemas/public/transfer.schema';

export const transferSchema = {
  name: Transfer.name,
  schema: TransferSchema,
};

export const catCategorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
}