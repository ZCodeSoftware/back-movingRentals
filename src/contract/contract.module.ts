import { Module } from '@nestjs/common/decorators/modules';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { cartSchema, catContractEventSchema } from '../catalogs/infrastructure/constants/custom-schema';
import { BookingTotalsService } from '../booking/application/services/booking-totals.service';
import { MovementModule } from '../movement/movement.module';
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
      cartSchema,
      catContractEventSchema
    ]),
    EventEmitterModule.forRoot(),
    MovementModule
  ],
  controllers: [ContractController],
  providers: [
    contractService,
    contractRepository,
    BookingTotalsService,
    {
      provide: SymbolsVehicle.IVehicleRepository,
      useClass: VehicleRepository,
    }
  ],
  exports: []
})
export class ContractModule { }
