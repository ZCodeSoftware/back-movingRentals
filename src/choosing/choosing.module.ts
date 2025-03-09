import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  choosingRepository,
  choosingService,
} from './infrastructure/nest/constants/custom-provider';
import {
  choosingSchema,
} from './infrastructure/nest/constants/custom-schema';
import { ChoosingController } from './infrastructure/nest/controllers/choosing.controller';

@Module({
  imports: [MongooseModule.forFeature([choosingSchema])],
  controllers: [ChoosingController],
  providers: [choosingService, choosingRepository],
  exports: []
})
export class ChoosingModule {}
