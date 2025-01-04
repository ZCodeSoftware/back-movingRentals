import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import {
  branchesRepository,
  cartRepository,
  cartService,
  ticketRepository,
  tourRepository,
  transferRepository,
  vehicleRepository,
} from './infrastructure/nest/constants/custom-provider';
import {
  branchesSchema,
  cartSchema,
  catCategorySchema,
  ticketSchema,
  tourSchema,
  transferSchema,
  vehicleSchema
} from './infrastructure/nest/constants/custom-schema';
import { CartController } from './infrastructure/nest/controllers/cart.controller';

@Module({
  imports: [MongooseModule.forFeature([cartSchema, branchesSchema, tourSchema, catCategorySchema, vehicleSchema, transferSchema, ticketSchema])],
  controllers: [CartController],
  providers: [cartService, cartRepository, branchesRepository, tourRepository, vehicleRepository, transferRepository, ticketRepository],
  exports: []
})
export class CartModule { }
