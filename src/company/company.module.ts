import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  branchesRepository,
  companyRepository,
  companyService,
  userRepository,
  userService,
} from './infrastructure/nest/constants/custom-provider';
import {
  branchesSchema,
  companySchema,
  userSchema,
} from './infrastructure/nest/constants/custom-schema';
import { CompanyController } from './infrastructure/nest/controllers/company.controller';

@Module({
  imports: [
    MongooseModule.forFeature([companySchema, branchesSchema, userSchema]),
  ],
  controllers: [CompanyController],
  providers: [
    companyService,
    companyRepository,
    branchesRepository,
    userService,
    userRepository,
  ],
})
export class CompanyModule {}
