import { Inject, Injectable } from '@nestjs/common';
import SymbolsAddress from '../../../address/symbols-address';
import SymbolsTour from '../../../tour/symbols-tour';
import SymbolsUser from '../../../user/symbols-user';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { BranchesModel } from '../../domain/models/branches.model';
import { IAddressRepository } from '../../domain/repositories/address.interface.repository';
import { IBranchesRepository } from '../../domain/repositories/branches.interface.repository';
import { ITourRepository } from '../../domain/repositories/tour.interface.repository';
import { IUserRepository } from '../../domain/repositories/user.interface.repository';
import { IVehicleRepository } from '../../domain/repositories/vehicle.interface.repository';
import { IBranchesService } from '../../domain/services/branches.interface.service';
import { ICreateBranches } from '../../domain/types/branches.type';
import SymbolsBranches from '../../symbols-branches';

@Injectable()
export class BranchesService implements IBranchesService {
  constructor(
    @Inject(SymbolsBranches.IBranchesRepository)
    private readonly branchesRepository: IBranchesRepository,
    @Inject(SymbolsAddress.IAddressRepository)
    private readonly addressRepository: IAddressRepository,
    @Inject(SymbolsVehicle.IVehicleRepository)
    private readonly vehicleRepository: IVehicleRepository,
    @Inject(SymbolsTour.ITourRepository)
    private readonly tourRepository: ITourRepository,
    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async create(branches: ICreateBranches): Promise<BranchesModel> {
    const { address, vehicles, tours, users, ...rest } = branches;
    const branchesModel = BranchesModel.create(rest);

    const existingAddress = await this.addressRepository.findById(address);

    branchesModel.addAddress(existingAddress);

    if (vehicles.length) {
      for (const vehicle of vehicles) {
        const existingVehicle = await this.vehicleRepository.findById(vehicle);

        branchesModel.addVehicles(existingVehicle);
      }
    }

    if (tours.length) {
      for (const tour of tours) {
        const existingTour = await this.tourRepository.findById(tour);

        branchesModel.addTours(existingTour);
      }
    }

    if (users.length) {
      for (const user of users) {
        const existingUser = await this.userRepository.findById(user);

        branchesModel.addUser(existingUser);
      }
    }

    return this.branchesRepository.create(branchesModel);
  }

  async findById(id: string): Promise<BranchesModel> {
    return this.branchesRepository.findById(id);
  }

  async findAll(): Promise<BranchesModel[]> {
    return this.branchesRepository.findAll();
  }
}
