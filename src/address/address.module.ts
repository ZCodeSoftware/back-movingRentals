import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  addressRepository,
  addressService,
} from './infrastructure/nest/constants/custom-provider';
import {
  addressSchema,
} from './infrastructure/nest/constants/custom-schema';
import { AddressController } from './infrastructure/nest/controllers/address.controller';

@Module({
  imports: [MongooseModule.forFeature([addressSchema])],
  controllers: [AddressController],
  providers: [addressService, addressRepository],
  exports: []
})
export class AddressModule {}
