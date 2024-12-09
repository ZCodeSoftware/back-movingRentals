import { CatCategory, CatCategorySchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { Tour, TourSchema } from '../../../../core/infrastructure/mongo/schemas/public/tour.schema';

export const tourSchema = {
  name: Tour.name,
  schema: TourSchema,
};

export const catCategorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
}