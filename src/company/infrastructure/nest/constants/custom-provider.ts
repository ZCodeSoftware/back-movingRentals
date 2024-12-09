import { UserService } from '../../../../auth/application/services/user.service';
import SymbolsBranches from '../../../../branches/symbols-branches';
import SymbolsUser from '../../../../user/symbols-user';
import { CompanyService } from '../../../application/services/company.service';
import SymbolsCompany from '../../../symbols-company';
import { BranchesRepository } from '../../mongo/repositories/branches.repository';
import { CompanyRepository } from '../../mongo/repositories/company.repository';
import { UserRepository } from '../../mongo/repositories/user.repository';

export const companyService = {
  provide: SymbolsCompany.ICompanyService,
  useClass: CompanyService,
};

export const companyRepository = {
  provide: SymbolsCompany.ICompanyRepository,
  useClass: CompanyRepository,
};

export const branchesRepository = {
  provide: SymbolsBranches.IBranchesRepository,
  useClass: BranchesRepository,
};

export const userRepository = {
  provide: SymbolsUser.IUserRepository,
  useClass: UserRepository,
};

export const userService = {
  provide: SymbolsUser.IUserService,
  useClass: UserService,
};
