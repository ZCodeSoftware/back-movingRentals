import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  tourRepository,
  tourService,
} from './infrastructure/nest/constants/custom-provider';
import {
  catCategorySchema,
  tourSchema,
} from './infrastructure/nest/constants/custom-schema';
import { TourController } from './infrastructure/nest/controllers/tour.controller';

@Module({
  imports: [MongooseModule.forFeature([tourSchema, catCategorySchema])],
  controllers: [TourController],
  providers: [tourService, tourRepository, catCategoryRepository],
  exports: []
})
export class TourModule { }
