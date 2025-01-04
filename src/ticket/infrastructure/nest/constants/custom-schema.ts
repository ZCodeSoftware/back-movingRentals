import { CatCategory, CatCategorySchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { Ticket, TicketSchema } from '../../../../core/infrastructure/mongo/schemas/public/ticket.schema';

export const ticketSchema = {
  name: Ticket.name,
  schema: TicketSchema,
};

export const categorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
}