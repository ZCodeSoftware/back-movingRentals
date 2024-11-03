import SymbolsCatalogs from 'src/catalogs/symbols-catalogs';
import { CatRoleService } from '../../../catalogs/application/services/cat-role.service';
import { CatRoleRepository } from '../mongo/repositories/cat-role.repository';

export const catRoleRepository = {
  provide: SymbolsCatalogs.ICatRoleRepository,
  useClass: CatRoleRepository,
};

export const catRoleService = {
  provide: SymbolsCatalogs.ICatRoleService,
  useClass: CatRoleService,
};
