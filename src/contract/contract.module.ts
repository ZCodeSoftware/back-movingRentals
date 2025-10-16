import { Module } from '@nestjs/common/decorators/modules';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { cartSchema, catContractEventSchema } from '../catalogs/infrastructure/constants/custom-schema';
import { BookingTotalsService } from '../booking/application/services/booking-totals.service';
import { MovementModule } from '../movement/movement.module';
import { CommissionModule } from '../commission/commission.module';
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
import { Movement, MovementSchema } from '../core/infrastructure/mongo/schemas/public/movement.schema';
import { ContractController } from './infrastructure/nest/controllers/contract.controller';
import { ContractMovementLinkService } from './application/services/contract-movement-link.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      contractSchema,
      bookingSchema,
      vehicleSchema,
      contractHistorySchema,
      cartVersionSchema,
      cartSchema,
      catContractEventSchema,
      { name: Movement.name, schema: MovementSchema }
    ]),
    EventEmitterModule.forRoot(),
    MovementModule,
    CommissionModule
  ],
  controllers: [ContractController],
  providers: [
    contractService,
    contractRepository,
    BookingTotalsService,
    ContractMovementLinkService,
    {
      provide: SymbolsVehicle.IVehicleRepository,
      useClass: VehicleRepository,
    }
  ],
  exports: []
})
export class ContractModule { }
