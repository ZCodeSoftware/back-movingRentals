import { Module } from '@nestjs/common/decorators/modules';
import { MongooseModule } from '@nestjs/mongoose';
import { categorySchema } from '../catalogs/infrastructure/constants/custom-schema';
import {
  catCategoryRepository,
  ticketRepository,
  ticketService,
} from './infrastructure/nest/constants/custom-provider';
import {
  ticketSchema,
} from './infrastructure/nest/constants/custom-schema';
import { TicketController } from './infrastructure/nest/controllers/ticket.controller';

@Module({
  imports: [MongooseModule.forFeature([ticketSchema, categorySchema])],
  controllers: [TicketController],
  providers: [ticketService, ticketRepository, catCategoryRepository],
  exports: []
})
export class TicketModule { }
