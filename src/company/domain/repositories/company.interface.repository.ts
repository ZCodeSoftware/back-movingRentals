import { CompanyModel } from '../models/company.model';

export interface ICompanyRepository {
  create(company: CompanyModel): Promise<CompanyModel>;
  findAll(): Promise<CompanyModel[]>;
  findByUserId(userId: string): Promise<CompanyModel>;
  findById(compnayId: string): Promise<CompanyModel>;
  addBranchesToCompany(
    id: string,
    company: CompanyModel,
  ): Promise<CompanyModel>;
}
