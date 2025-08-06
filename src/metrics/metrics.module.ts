import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsController } from './infrastructure/nest/controllers/metrics.controller';
import { metricsService, metricsRepository } from './infrastructure/nest/constants/custom-provider';
import {
  userSchema,
  vehicleSchema,
  bookingSchema,
  cartSchema,
  categorySchema,
  statusSchema,
} from './infrastructure/nest/constants/custom-schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      userSchema,
      vehicleSchema,
      bookingSchema,
      cartSchema,
      categorySchema,
      statusSchema,
    ]),
  ],
  controllers: [MetricsController],
  providers: [metricsService, metricsRepository],
  exports: [metricsService],
})
export class MetricsModule {}