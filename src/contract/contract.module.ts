import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicle, VehicleSchema } from '../core/infrastructure/mongo/schemas/public/vehicle.schema';
import { VehicleRepository } from '../vehicle/infrastructure/mongo/repositories/vehicle.repository';
import SymbolsVehicle from '../vehicle/symbols-vehicle';
import {
  contractRepository,
  contractService,
} from './infrastructure/nest/constants/custom-provider';
import {
  contractSchema,
} from './infrastructure/nest/constants/custom-schema';
import { ContractController } from './infrastructure/nest/controllers/contract.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      contractSchema,
      { name: Vehicle.name, schema: VehicleSchema }
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
export class ContractModule {}
