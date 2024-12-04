import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { CompanyModel } from '../../../domain/models/company.model';
import { ICompanyRepository } from '../../../domain/repositories/company.interface.repository';
import { CompanySchema } from '../schemas/company.schema';

export class CompanyRepository implements ICompanyRepository {
  constructor(
    @InjectModel('Company') private readonly companyModel: Model<CompanySchema>,
  ) {}

  async create(company: CompanyModel): Promise<CompanyModel> {
    try {
      const schema = new this.companyModel(company.toJSON());

      const saved = await schema.save();

      return CompanyModel.hydrate(saved);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findAll(): Promise<CompanyModel[]> {
    try {
      const companies = await this.companyModel.find().populate('users');

      return companies.map((company) => CompanyModel.hydrate(company));
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findByUserId(userId: string): Promise<CompanyModel> {
    try {
      const company = await this.companyModel
        .findOne({ users: userId })
        .populate('users');

      if (!company) {
        throw new BaseErrorException(
          `Company not found for user ID: ${userId}`,
          404,
        );
      }

      return CompanyModel.hydrate(company);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode || 500);
    }
  }
}
