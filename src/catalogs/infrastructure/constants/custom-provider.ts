import SymbolsCatalogs from 'src/catalogs/symbols-catalogs';
import { CatRoleService } from '../../../catalogs/application/services/cat-role.service';
import { CatCategoryService } from '../../application/services/cat-category.service';
import { CatCategoryRepository } from '../mongo/repositories/cat-category.repository';
import { CatRoleRepository } from '../mongo/repositories/cat-role.repository';

export const catRoleRepository = {
  provide: SymbolsCatalogs.ICatRoleRepository,
  useClass: CatRoleRepository,
};

export const catRoleService = {
  provide: SymbolsCatalogs.ICatRoleService,
  useClass: CatRoleService,
};


export const catCategoryRepository = {
  provide: SymbolsCatalogs.ICatCategoryRepository,
  useClass: CatCategoryRepository,
}

export const catCategoryService = {
  provide: SymbolsCatalogs.ICatCategoryService,
  useClass: CatCategoryService,
}