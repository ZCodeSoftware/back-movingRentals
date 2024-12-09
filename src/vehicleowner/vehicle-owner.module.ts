import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  vehicleOwnerRepository,
  vehicleOwnerService,
} from './infrastructure/nest/constants/custom-provider';

import { vehicleOwnerSchema } from './infrastructure/nest/constants/custom-schema';
import { VehicleOwnerController } from './infrastructure/nest/controllers/vehicleowner.controller';

@Module({
  imports: [MongooseModule.forFeature([vehicleOwnerSchema])],
  controllers: [VehicleOwnerController],
  providers: [vehicleOwnerService, vehicleOwnerRepository],
  exports: []
})
export class VehicleOwnerModule { }
