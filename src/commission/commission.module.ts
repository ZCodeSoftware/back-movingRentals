import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { commissionRepository, commissionService, userRepository, vehicleRepository, vehicleOwnerRepository } from './infrastructure/nest/constants/custom-provider';
import { commissionSchema, userSchema, vehicleSchema, vehicleOwnerSchema } from './infrastructure/nest/constants/custom-schema';
import { CommissionController } from './infrastructure/nest/controllers/commission.controller';

@Module({
  imports: [MongooseModule.forFeature([commissionSchema, userSchema, vehicleSchema, vehicleOwnerSchema])],
  controllers: [CommissionController],
  providers: [commissionService, commissionRepository, userRepository, vehicleRepository, vehicleOwnerRepository],
  exports: [commissionRepository],
})
export class CommissionModule {}
