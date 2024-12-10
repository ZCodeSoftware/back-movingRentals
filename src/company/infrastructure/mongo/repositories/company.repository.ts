import { HttpStatus } from '@nestjs/common';
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
      const companies = await this.companyModel
        .find()
        .populate('users branches');

      return companies.map((company) => CompanyModel.hydrate(company));
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findById(compnayId: string): Promise<CompanyModel> {
    try {
      const company = await this.companyModel
        .findById(compnayId)
        .populate('users branches');

      return CompanyModel.hydrate(company);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode || 500);
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

  async addBranchesToCompany(
    id: string,
    company: CompanyModel,
  ): Promise<CompanyModel> {
    try {
      const existingCompany = await this.companyModel
        .findById(id)
        .populate('branches');

      if (!existingCompany) {
        throw new BaseErrorException(
          `The company with ID ${id} does not exist`,
          HttpStatus.NOT_FOUND,
        );
      }

      const existingBranchIds = new Set(
        existingCompany.branches?.map((branch: any) => branch._id.toString()),
      );

      const newBranchIds = (company.toJSON().branches || []).map(
        (branch: any) => {
          if (!branch._id) {
            throw new BaseErrorException(
              'Invalid branch data. Expected branches to have an _id.',
              HttpStatus.BAD_REQUEST,
            );
          }
          return branch._id.toString();
        },
      );

      const uniqueBranchIds = newBranchIds.filter(
        (id) => !existingBranchIds.has(id),
      );

      const updated = await this.companyModel
        .findByIdAndUpdate(
          id,
          { branches: [...existingBranchIds, ...uniqueBranchIds] },
          { new: true },
        )
        .populate('branches');

      if (!updated) {
        throw new BaseErrorException(
          "Couldn't update the company",
          HttpStatus.BAD_REQUEST,
        );
      }

      return CompanyModel.hydrate(updated);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode || 500);
    }
  }
}
