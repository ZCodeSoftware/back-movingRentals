import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  vehicleOwnerRepository,
  vehicleOwnerService,
} from './infrastructure/nest/constants/custom-provider';

import { vehicleOwnerSchema } from './infrastructure/nest/constants/custom-schema';
import { VehicleOwnerController } from './infrastructure/nest/controllers/vehicleowner.controller';
import { VehicleOwnerSeed } from './infrastructure/mongo/seed/vehicle-owner.seed';

@Module({
  imports: [MongooseModule.forFeature([vehicleOwnerSchema])],
  controllers: [VehicleOwnerController],
  providers: [vehicleOwnerService, vehicleOwnerRepository, VehicleOwnerSeed],
  exports: []
})
export class VehicleOwnerModule { }
