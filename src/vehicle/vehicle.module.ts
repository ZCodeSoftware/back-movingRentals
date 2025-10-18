import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionalPrice, PromotionalPriceSchema } from '../core/infrastructure/mongo/schemas/public/promotional-price.schema';
import {
  catCategoryRepository,
  modelRepository,
  vehicleOwnerRepository,
  vehicleRepository,
  vehicleService,
} from './infrastructure/nest/constants/custom-provider';
import {
  catCategorySchema,
  catModelSchema,
  vehicleOwnerSchema,
  vehicleSchema,
} from './infrastructure/nest/constants/custom-schema';
import { VehicleController } from './infrastructure/nest/controllers/vehicle.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      vehicleSchema,
      vehicleOwnerSchema,
      catCategorySchema,
      catModelSchema,
      { name: PromotionalPrice.name, schema: PromotionalPriceSchema },
    ])
  ],
  controllers: [VehicleController],
  providers: [vehicleService, vehicleRepository, catCategoryRepository, vehicleOwnerRepository, catCategoryRepository, modelRepository],
  exports: []
})
export class VehicleModule { }
