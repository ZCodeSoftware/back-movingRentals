import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  addressRepository,
  branchesRepository,
  branchesService,
  carouselRepository,
  tourRepository,
  userRepository,
  vehicleRepository,
} from './infrastructure/nest/constants/custom-provider';
import {
  addressSchema,
  branchesSchema,
  carouselSchema,
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
      carouselSchema
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
    carouselRepository
  ],
  exports: [branchesRepository],
})
export class BranchesModule { }
