import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  companyRepository,
  companyService,
  userRepository,
} from './infrastructure/nest/constants/custom-provider';
import {
  companySchema,
  userSchema,
} from './infrastructure/nest/constants/custom-schema';
import { CompanyController } from './infrastructure/nest/controllers/company.controller';

@Module({
  imports: [MongooseModule.forFeature([companySchema, userSchema])],
  controllers: [CompanyController],
  providers: [companyService, companyRepository, userRepository],
})
export class CompanyModule {}
