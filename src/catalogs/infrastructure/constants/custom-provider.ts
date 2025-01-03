import { AddressRepository } from '../../../address/infrastructure/mongo/repositories/address.repository';
import SymbolsAddress from '../../../address/symbols-address';
import { CatRoleService } from '../../../catalogs/application/services/cat-role.service';
import { UserService } from '../../../user/application/services/user.service';
import { UserRepository } from '../../../user/infrastructure/mongo/repositories/user.repository';
import SymbolsUser from '../../../user/symbols-user';
import { CatCategoryService } from '../../application/services/cat-category.service';
import { CatCountryService } from '../../application/services/cat-country.service';
import { CatDocumentService } from '../../application/services/cat-document.service';
import { CatPaymentMethodService } from '../../application/services/cat-payment-method.service';
import { CatPriceConditionService } from '../../application/services/cat-price-condition.service';
import SymbolsCatalogs from '../../symbols-catalogs';
import { CatCategoryRepository } from '../mongo/repositories/cat-category.repository';
import { CatCountryRepository } from '../mongo/repositories/cat-country.repository';
import { CatDocumentRepository } from '../mongo/repositories/cat-document.repository';
import { CatPaymentMethodRepository } from '../mongo/repositories/cat-payment-method.repository';
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

export const catPaymentMethodRepository = {
  provide: SymbolsCatalogs.ICatPaymentMethodRepository,
  useClass: CatPaymentMethodRepository,
};

export const catPaymentMethodService = {
  provide: SymbolsCatalogs.ICatPaymentMethodService,
  useClass: CatPaymentMethodService,
};

export const userService = {
  provide: SymbolsUser.IUserService,
  useClass: UserService,
};

export const userRepository = {
  provide: SymbolsUser.IUserRepository,
  useClass: UserRepository,
};

export const countryRepository = {
  provide: SymbolsCatalogs.ICatCountryRepository,
  useClass: CatCountryRepository,
};

export const countryService = {
  provide: SymbolsCatalogs.ICatCountryService,
  useClass: CatCountryService,
};

export const addressRepository = {
  provide: SymbolsAddress.IAddressRepository,
  useClass: AddressRepository,
};
