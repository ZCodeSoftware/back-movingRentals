import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  addressRepository,
  addressService,
  countryRepository,
} from './infrastructure/nest/constants/custom-provider';
import {
  addressSchema,
  countrySchema,
} from './infrastructure/nest/constants/custom-schema';
import { AddressController } from './infrastructure/nest/controllers/address.controller';

@Module({
  imports: [MongooseModule.forFeature([addressSchema, countrySchema])],
  controllers: [AddressController],
  providers: [addressService, addressRepository, countryRepository],
  exports: [],
})
export class AddressModule {}
