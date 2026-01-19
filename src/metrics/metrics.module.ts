import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { metricsRepository, metricsService } from './infrastructure/nest/constants/custom-provider';
import {
  bookingSchema,
  cartSchema,
  categorySchema,
  movementSchema,
  statusSchema,
  userSchema,
  vehicleSchema,
} from './infrastructure/nest/constants/custom-schema';
import { MetricsController } from './infrastructure/nest/controllers/metrics.controller';
import { Contract, ContractSchema } from '../core/infrastructure/mongo/schemas/public/contract.schema';
import { ContractHistory, ContractHistorySchema } from '../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { CatContractEvent, CatContractEventSchema } from '../core/infrastructure/mongo/schemas/catalogs/cat-contract-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      userSchema,
      vehicleSchema,
      bookingSchema,
      cartSchema,
      categorySchema,
      statusSchema,
      movementSchema,
      { name: 'Contract', schema: ContractSchema },
      { name: 'ContractHistory', schema: ContractHistorySchema },
      { name: 'CatContractEvent', schema: CatContractEventSchema },
    ]),
  ],
  controllers: [MetricsController],
  providers: [metricsService, metricsRepository],
  exports: [metricsService],
})
export class MetricsModule { }