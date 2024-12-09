import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  vehicleOwnerRepository,
  vehicleRepository,
  vehicleService,
} from './infrastructure/nest/constants/custom-provider';
import {
  catCategorySchema,
  vehicleOwnerSchema,
  vehicleSchema,
} from './infrastructure/nest/constants/custom-schema';
import { VehicleController } from './infrastructure/nest/controllers/vehicle.controller';

@Module({
  imports: [MongooseModule.forFeature([vehicleSchema, vehicleOwnerSchema, catCategorySchema])],
  controllers: [VehicleController],
  providers: [vehicleService, vehicleRepository, catCategoryRepository, vehicleOwnerRepository, catCategoryRepository],
  exports: []
})
export class VehicleModule { }
