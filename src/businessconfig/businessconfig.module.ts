import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import {
  businessconfigRepository,
  businessconfigService,
} from './infrastructure/nest/constants/custom-provider';
import {
  businessconfigSchema,
} from './infrastructure/nest/constants/custom-schema';
import { BusinessConfigController } from './infrastructure/nest/controllers/businessconfig.controller';

@Module({
  imports: [
    MongooseModule.forFeature([businessconfigSchema]),
    BranchesModule
  ],
  controllers: [BusinessConfigController],
  providers: [businessconfigService, businessconfigRepository],
  exports: []
})
export class BusinessConfigModule {}
