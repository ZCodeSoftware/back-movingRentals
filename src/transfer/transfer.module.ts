import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  transferRepository,
  transferService,
} from './infrastructure/nest/constants/custom-provider';
import {
  catCategorySchema,
  transferSchema,
} from './infrastructure/nest/constants/custom-schema';
import { TransferController } from './infrastructure/nest/controllers/transfer.controller';

@Module({
  imports: [MongooseModule.forFeature([transferSchema, catCategorySchema])],
  controllers: [TransferController],
  providers: [transferService, transferRepository, catCategoryRepository],
  exports: []
})
export class TransferModule { }
