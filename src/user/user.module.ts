import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
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
    ]),
  ],
  controllers: [UserController],
  providers: [
    userService,
    userRepository,
    catRoleRepository,
    addressRepository,
  ],
})
export class UserModule {}
