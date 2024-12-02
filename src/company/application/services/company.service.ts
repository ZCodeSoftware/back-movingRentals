import { Inject } from '@nestjs/common';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import SymbolsUser from '../../../user/symbols-user';
import { CompanyModel } from '../../domain/models/company.model';
import { ICompanyRepository } from '../../domain/repositories/company.interface.repository';
import { IUserRepository } from '../../domain/repositories/user.interface.repository';
import { ICompanyService } from '../../domain/services/company.interface.service';
import { ICompanyCreate } from '../../domain/types/company.type';
import SymbolsCompany from '../../symbols-company';

export class CompanyService implements ICompanyService {
  constructor(
    @Inject(SymbolsCompany.ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async createCompany(company: ICompanyCreate): Promise<CompanyModel> {
    try {
      const companyModel = CompanyModel.create({ name: company.name });

      if (company.users.length) {
        for (const user of company.users) {
          const existingUser = await this.userRepository.findById(user);

          companyModel.addUser(existingUser);
        }
      }

      const companySave = await this.companyRepository.create(companyModel);

      return companySave;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findAll(): Promise<CompanyModel[]> {
    try {
      const found = await this.companyRepository.findAll();

      return found;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findByUserId(userId: string): Promise<CompanyModel> {
    try {
      const found = await this.companyRepository.findByUserId(userId);

      return found;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
