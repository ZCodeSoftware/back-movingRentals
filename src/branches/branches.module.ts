import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  addressRepository,
  branchesRepository,
  branchesService,
  tourRepository,
  userRepository,
  vehicleRepository,
} from './infrastructure/nest/constants/custom-provider';
import {
  addressSchema,
  branchesSchema,
  tourSchema,
  userSchema,
  vehicleSchema,
} from './infrastructure/nest/constants/custom-schema';
import { BranchesController } from './infrastructure/nest/controllers/branches.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      branchesSchema,
      addressSchema,
      vehicleSchema,
      tourSchema,
      userSchema,
    ]),
  ],
  controllers: [BranchesController],
  providers: [
    branchesService,
    branchesRepository,
    addressRepository,
    vehicleRepository,
    tourRepository,
    userRepository,
  ],
  exports: [],
})
export class BranchesModule {}
