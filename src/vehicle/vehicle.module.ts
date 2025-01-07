import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
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
  imports: [MongooseModule.forFeature([vehicleSchema, vehicleOwnerSchema, catCategorySchema, catModelSchema])],
  controllers: [VehicleController],
  providers: [vehicleService, vehicleRepository, catCategoryRepository, vehicleOwnerRepository, catCategoryRepository, modelRepository],
  exports: []
})
export class VehicleModule { }
