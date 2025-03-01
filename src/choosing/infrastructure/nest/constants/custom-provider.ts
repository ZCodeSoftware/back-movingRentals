import { ChoosingService } from '../../../application/services/choosing.service';
import SymbolsChoosing from '../../../symbols-choosing';
import { ChoosingRepository } from '../../mongo/repositories/choosing.repository';

export const choosingService = {
  provide: SymbolsChoosing.IChoosingService,
  useClass: ChoosingService,
};

export const choosingRepository = {
  provide: SymbolsChoosing.IChoosingRepository,
  useClass: ChoosingRepository,
};
