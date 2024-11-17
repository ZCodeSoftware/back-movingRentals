import SymbolsCatalogs from 'src/catalogs/symbols-catalogs';
import { CatRoleService } from '../../../catalogs/application/services/cat-role.service';
import { CatDocumentService } from '../../application/services/cat-document.service';
import { CatDocumentRepository } from '../mongo/repositories/cat-document.repository';
import { CatRoleRepository } from '../mongo/repositories/cat-role.repository';

export const catRoleRepository = {
  provide: SymbolsCatalogs.ICatRoleRepository,
  useClass: CatRoleRepository,
};

export const catRoleService = {
  provide: SymbolsCatalogs.ICatRoleService,
  useClass: CatRoleService,
};

export const catDocumentRepository = {
  provide: SymbolsCatalogs.ICatDocumentRepository,
  useClass: CatDocumentRepository,
};

export const catDocumentService = {
  provide: SymbolsCatalogs.ICatDocumentService,
  useClass: CatDocumentService,
};
