import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionalPrice, PromotionalPriceSchema } from '../core/infrastructure/mongo/schemas/public/promotional-price.schema';
import { commissionRepository, commissionService, userRepository, vehicleRepository, vehicleOwnerRepository, bookingRepository } from './infrastructure/nest/constants/custom-provider';
import { commissionSchema, userSchema, vehicleSchema, vehicleOwnerSchema, bookingSchema } from './infrastructure/nest/constants/custom-schema';
import { CommissionController } from './infrastructure/nest/controllers/commission.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      commissionSchema,
      userSchema,
      vehicleSchema,
      vehicleOwnerSchema,
      bookingSchema,
      { name: PromotionalPrice.name, schema: PromotionalPriceSchema },
    ])
  ],
  controllers: [CommissionController],
  providers: [commissionService, commissionRepository, userRepository, vehicleRepository, vehicleOwnerRepository, bookingRepository],
  exports: [commissionRepository],
})
export class CommissionModule {}
