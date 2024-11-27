import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import config from '../config';
import {
  apiKeyService,
  authService,
  tokenService,
  userRepository,
  userService,
} from './infrastructure/constants/custom-provider';
import { userSchema } from './infrastructure/constants/custom-schema';
import { AuthController } from './infrastructure/nest/controllers/auth.controller';
import { HeaderApiKeyStrategy } from './infrastructure/nest/strategies/header-apikey.strategy';
import { JwtStrategy } from './infrastructure/nest/strategies/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([userSchema]),
    JwtModule.register({
      global: true,
      secret: config().auth.jwt.secret,
      signOptions: { expiresIn: config().auth.jwt.expiresIn },
    }),
  ],
  providers: [
    userService,
    userRepository,
    authService,
    tokenService,
    apiKeyService,
    ConfigService,
    HeaderApiKeyStrategy,
    JwtStrategy,
  ],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}
