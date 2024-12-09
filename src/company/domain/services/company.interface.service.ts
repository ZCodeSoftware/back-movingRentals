import { CompanyModel } from '../models/company.model';
import { IAddBranchesToCompany, ICompanyCreate } from '../types/company.type';

export interface ICompanyService {
  createCompany(company: ICompanyCreate): Promise<CompanyModel>;
  findAll(): Promise<CompanyModel[]>;
  findByUserId(userId: string): Promise<CompanyModel>;
  addBranchesToCompany(company: IAddBranchesToCompany): Promise<any>;
}
