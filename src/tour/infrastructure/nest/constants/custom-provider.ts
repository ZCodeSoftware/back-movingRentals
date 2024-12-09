import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { TourService } from '../../../application/services/tour.service';
import SymbolsTour from '../../../symbols-tour';
import { CatCategoryRepository } from '../../mongo/repositories/cat-category.repository';
import { TourRepository } from '../../mongo/repositories/tour.repository';

export const tourService = {
  provide: SymbolsTour.ITourService,
  useClass: TourService,
};

export const tourRepository = {
  provide: SymbolsTour.ITourRepository,
  useClass: TourRepository,
};

export const catCategoryRepository = {
  provide: SymbolsCatalogs.ICatCategoryRepository,
  useClass: CatCategoryRepository,
}