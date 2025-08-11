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

@Module({
  imports: [
    MongooseModule.forFeature([
      userSchema,
      vehicleSchema,
      bookingSchema,
      cartSchema,
      categorySchema,
      statusSchema,
      movementSchema
    ]),
  ],
  controllers: [MetricsController],
  providers: [metricsService, metricsRepository],
  exports: [metricsService],
})
export class MetricsModule { }