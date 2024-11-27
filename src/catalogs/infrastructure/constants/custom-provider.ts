import SymbolsCatalogs from 'src/catalogs/symbols-catalogs';
import { CatRoleService } from '../../../catalogs/application/services/cat-role.service';
import { UserService } from '../../../user/application/services/user.service';
import { UserRepository } from '../../../user/infrastructure/mongo/repositories/user.repository';
import SymbolsUser from '../../../user/symbols-user';
import { CatCategoryService } from '../../application/services/cat-category.service';
import { CatDocumentService } from '../../application/services/cat-document.service';
import { CatPriceConditionService } from '../../application/services/cat-price-condition.service';
import { CatCategoryRepository } from '../mongo/repositories/cat-category.repository';
import { CatDocumentRepository } from '../mongo/repositories/cat-document.repository';
import { CatPriceConditionRepository } from '../mongo/repositories/cat-price-condition.repository';
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

export const catCategoryRepository = {
  provide: SymbolsCatalogs.ICatCategoryRepository,
  useClass: CatCategoryRepository,
};

export const catCategoryService = {
  provide: SymbolsCatalogs.ICatCategoryService,
  useClass: CatCategoryService,
};

export const catPriceConditionRepository = {
  provide: SymbolsCatalogs.ICatPriceConditionRepository,
  useClass: CatPriceConditionRepository,
};

export const catPriceConditionService = {
  provide: SymbolsCatalogs.ICatPriceConditionService,
  useClass: CatPriceConditionService,
};

export const userService = {
  provide: SymbolsUser.IUserService,
  useClass: UserService,
};

export const userRepository = {
  provide: SymbolsUser.IUserRepository,
  useClass: UserRepository,
};
