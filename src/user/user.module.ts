import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { countryRepository } from '../catalogs/infrastructure/constants/custom-provider';
import { countrySchema } from '../catalogs/infrastructure/constants/custom-schema';
import {
  addressRepository,
  catRoleRepository,
  userRepository,
  userService,
} from './infrastructure/nest/constants/custom-provider';
import {
  addressSchema,
  cartSchema,
  roleSchema,
  userSchema,
} from './infrastructure/nest/constants/custom-schema';
import { UserController } from './infrastructure/nest/controllers/user.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      userSchema,
      roleSchema,
      cartSchema,
      addressSchema,
      countrySchema,
    ]),
  ],
  controllers: [UserController],
  providers: [
    userService,
    userRepository,
    catRoleRepository,
    addressRepository,
    countryRepository,
  ],
  exports: [
    userRepository,
  ],
})
export class UserModule {}
