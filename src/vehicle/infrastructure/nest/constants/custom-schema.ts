import { CatCategory, CatCategorySchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { CatModel, CatModelSchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-model.schema';
import { VehicleOwner, VehicleOwnerSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle-owner.schema';
import { Vehicle, VehicleSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema,
};

export const vehicleOwnerSchema = {
  name: VehicleOwner.name,
  schema: VehicleOwnerSchema,
}

export const catCategorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
}

export const catModelSchema = {
  name: CatModel.name,
  schema: CatModelSchema,
}