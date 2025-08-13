import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { cartSchema } from '../catalogs/infrastructure/constants/custom-schema';
import { VehicleRepository } from '../vehicle/infrastructure/mongo/repositories/vehicle.repository';
import SymbolsVehicle from '../vehicle/symbols-vehicle';
import {
  contractRepository,
  contractService,
} from './infrastructure/nest/constants/custom-provider';
import {
  bookingSchema,
  cartVersionSchema,
  contractHistorySchema,
  contractSchema,
  vehicleSchema,
} from './infrastructure/nest/constants/custom-schema';
import { ContractController } from './infrastructure/nest/controllers/contract.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      contractSchema,
      bookingSchema,
      vehicleSchema,
      contractHistorySchema,
      cartVersionSchema,
      cartSchema
    ])
  ],
  controllers: [ContractController],
  providers: [
    contractService,
    contractRepository,
    {
      provide: SymbolsVehicle.IVehicleRepository,
      useClass: VehicleRepository,
    }
  ],
  exports: []
})
export class ContractModule { }
