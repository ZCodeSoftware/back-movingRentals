import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { TicketService } from '../../../application/services/ticket.service';
import SymbolsTicket from '../../../symbols-ticket';
import { CatCategoryRepository } from '../../mongo/repositories/cat-category.repository';
import { TicketRepository } from '../../mongo/repositories/ticket.repository';

export const ticketService = {
  provide: SymbolsTicket.ITicketService,
  useClass: TicketService,
};

export const ticketRepository = {
  provide: SymbolsTicket.ITicketRepository,
  useClass: TicketRepository,
};

export const catCategoryRepository = {
  provide: SymbolsCatalogs.ICatCategoryRepository,
  useClass: CatCategoryRepository,
}