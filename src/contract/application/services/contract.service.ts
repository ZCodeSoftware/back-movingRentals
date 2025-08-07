import { Inject, Injectable } from '@nestjs/common';
import { IVehicleRepository } from '../../../vehicle/domain/repositories/vehicle.interface.repository';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { ContractModel } from '../../domain/models/contract.model';
import { IContractFilters, IContractRepository, IPaginatedContractResponse } from '../../domain/repositories/contract.interface.repository';
import { IContractService } from '../../domain/services/contract.interface.service';
import { ICreateContract } from '../../domain/types/contract.type';
import SymbolsContract from '../../symbols-contract';

@Injectable()
export class ContractService implements IContractService {
  constructor(
    @Inject(SymbolsContract.IContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(SymbolsVehicle.IVehicleRepository)
    private readonly vehicleRepository: IVehicleRepository,
  ) { }

  async create(contract: ICreateContract, userId: string): Promise<ContractModel> {
    const processedContract = {
      ...contract,
      createdByUser: userId,
      extension: contract.extension ? {
        ...contract.extension,
        newEndDateTime: contract.extension.newEndDateTime ? new Date(contract.extension.newEndDateTime) : undefined,
      } : undefined,
    };

    const contractModel = ContractModel.create(processedContract);

    return await this.contractRepository.create(contractModel, userId);
  }

  async findById(id: string): Promise<ContractModel> {
    return await this.contractRepository.findById(id);
  }

  async findAll(filters: IContractFilters): Promise<IPaginatedContractResponse> {
    return await this.contractRepository.findAll(filters);
  }

  async update(id: string, contract: Partial<ICreateContract>): Promise<ContractModel> {
    // Get the current contract to check for existing extension
    const currentContract = await this.contractRepository.findById(id);

    // Convert the DTO to the appropriate format for the repository
    const updateData: any = {};

    if (contract.booking) {
      updateData.booking = contract.booking;
    }

    if (contract.reservingUser) {
      updateData.reservingUser = contract.reservingUser;
    }

    if (contract.status) {
      updateData.status = contract.status;
    }

    if (contract.extension) {
      updateData.extension = {
        ...contract.extension,
        newEndDateTime: contract.extension.newEndDateTime ? new Date(contract.extension.newEndDateTime) : undefined,
      };

      // Update vehicle reservations if extension has a new end date
      if (contract.extension.newEndDateTime) {
        await this.updateVehicleReservations(
          currentContract,
          new Date(contract.extension.newEndDateTime)
        );
      }
    }

    return await this.contractRepository.update(id, updateData);
  }

  private async updateVehicleReservations(contract: ContractModel, newEndDate: Date): Promise<void> {
    try {
      // Get the booking to access the cart
      const booking = contract.toJSON().booking;
      if (!booking || !booking.cart) return;

      // Parse the cart JSON string to get the cart data at the time of booking
      // This preserves the exact state when the booking was made
      let cartData: any;
      try {
        cartData = JSON.parse(booking.cart);
      } catch (parseError) {
        console.error('Error parsing cart JSON:', parseError);
        return;
      }

      if (!cartData.vehicles || cartData.vehicles.length === 0) return;

      // Update reservations for each vehicle in the cart
      for (const vehicleItem of cartData.vehicles) {
        if (vehicleItem.vehicle && vehicleItem.dates) {
          const vehicleId = typeof vehicleItem.vehicle === 'string'
            ? vehicleItem.vehicle
            : String(vehicleItem.vehicle._id);

          const originalEndDate = new Date(vehicleItem.dates.end);

          await this.vehicleRepository.updateReservation(
            vehicleId,
            originalEndDate,
            newEndDate
          );
        }
      }
    } catch (error) {
      console.error('Error updating vehicle reservations:', error);
      // Don't throw error to avoid breaking the contract update
    }
  }
}