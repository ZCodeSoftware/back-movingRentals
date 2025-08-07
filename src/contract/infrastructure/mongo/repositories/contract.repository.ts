import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContractModel } from '../../../domain/models/contract.model';
import { IContractRepository, IContractFilters, IPaginatedContractResponse } from '../../../domain/repositories/contract.interface.repository';
import { Contract, ContractDocument } from '../../../../core/infrastructure/mongo/schemas/public/contract.schema';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import { UserModel } from '../../../../user/domain/models/user.model';
import { CatStatusModel } from '../../../../booking/domain/models/cat-status.model';

@Injectable()
export class ContractRepository implements IContractRepository {
  constructor(
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  async create(contract: ContractModel, userId: string): Promise<ContractModel> {
    const contractData = {
      booking: contract.booking?.id?.toValue() || contract.booking,
      reservingUser: contract.reservingUser?.id?.toValue() || contract.reservingUser,
      createdByUser: userId,
      contractNumber: contract.contractNumber,
      status: contract.status?.id?.toValue() || contract.status,
      extension: contract.extension,
    };

    const createdContract = new this.contractModel(contractData);
    const savedContract = await createdContract.save();
    
    await savedContract.populate([
      { path: 'booking' },
      { path: 'reservingUser' },
      { path: 'createdByUser' },
      { path: 'status' },
      { path: 'extension.paymentMethod' },
      { path: 'extension.extensionStatus' }
    ]);

    return ContractModel.hydrate(savedContract.toObject());
  }

  async findById(id: string): Promise<ContractModel> {
    const contract = await this.contractModel
      .findById(id)
      .populate([
        { path: 'booking' },
        { path: 'reservingUser' },
        { path: 'createdByUser' },
        { path: 'status' },
        { path: 'extension.paymentMethod' },
        { path: 'extension.extensionStatus' }
      ])
      .exec();

    if (!contract) {
      throw new Error('Contract not found');
    }

    return ContractModel.hydrate(contract.toObject());
  }

  async findAll(filters: IContractFilters): Promise<IPaginatedContractResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build query filters
    const query: any = {};
    
    if (filters.contractNumber) {
      query.contractNumber = filters.contractNumber;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.reservingUser) {
      query.reservingUser = filters.reservingUser;
    }
    
    if (filters.createdByUser) {
      query.createdByUser = filters.createdByUser;
    }

    // Execute query with pagination
    const [contracts, totalItems] = await Promise.all([
      this.contractModel
        .find(query)
        .populate([
          { path: 'booking' },
          { path: 'reservingUser' },
          { path: 'createdByUser' },
          { path: 'status' },
          { path: 'extension.paymentMethod' },
          { path: 'extension.extensionStatus' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.contractModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const contractModels = contracts.map(contract => 
      ContractModel.hydrate(contract.toObject())
    );

    return {
      data: contractModels,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async update(id: string, contractData: any): Promise<ContractModel> {
    const updateData: any = {};
    
    if (contractData.booking) {
      updateData.booking = contractData.booking;
    }
    
    if (contractData.reservingUser) {
      updateData.reservingUser = contractData.reservingUser;
    }
    
    if (contractData.status) {
      updateData.status = contractData.status;
    }
    
    if (contractData.extension) {
      updateData.extension = contractData.extension;
    }

    const updatedContract = await this.contractModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate([
        { path: 'booking' },
        { path: 'reservingUser' },
        { path: 'createdByUser' },
        { path: 'status' },
        { path: 'extension.paymentMethod' },
        { path: 'extension.extensionStatus' }
      ])
      .exec();

    if (!updatedContract) {
      throw new Error('Contract not found');
    }

    return ContractModel.hydrate(updatedContract.toObject());
  }
}