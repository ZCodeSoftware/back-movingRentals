import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  movementRepository,
  movementService,
} from './infrastructure/nest/constants/custom-provider';
import {
  movementSchema,
} from './infrastructure/nest/constants/custom-schema';
import { MovementController } from './infrastructure/nest/controllers/movement.controller';

@Module({
  imports: [MongooseModule.forFeature([movementSchema])],
  controllers: [MovementController],
  providers: [movementService, movementRepository],
  exports: []
})
export class MovementModule {}
