import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  faqRepository,
  faqService,
} from './infrastructure/nest/constants/custom-provider';
import {
  faqSchema,
} from './infrastructure/nest/constants/custom-schema';
import { FaqController } from './infrastructure/nest/controllers/faq.controller';

@Module({
  imports: [MongooseModule.forFeature([faqSchema])],
  controllers: [FaqController],
  providers: [faqService, faqRepository],
  exports: []
})
export class FaqModule {}
