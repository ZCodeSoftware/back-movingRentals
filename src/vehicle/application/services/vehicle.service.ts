import { Inject, Injectable } from "@nestjs/common";
import SymbolsCatalogs from "../../../catalogs/symbols-catalogs";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import SymbolsVehicleOwner from "../../../vehicleowner/symbols-vehicleowner";
import { VehicleModel } from "../../domain/models/vehicle.model";
import { ICatCategoryRepository } from "../../domain/repositories/cat-category.interface.repository";
import { ICatModelRepository } from "../../domain/repositories/cat-model.interface.repository";
import { IVehicleRepository } from "../../domain/repositories/vehicle.interface.repository";
import { IVehicleOwnerRepository } from "../../domain/repositories/vehicleowner.interface.repository";
import { IVehicleService } from "../../domain/services/vehicle.interface.service";
import { ICreateVehicle, IUpdatePriceByModel, IUpdateVehicle } from "../../domain/types/vehicle.type";
import SymbolsVehicle from "../../symbols-vehicle";

@Injectable()
export class VehicleService implements IVehicleService {
    constructor(
        @Inject(SymbolsVehicle.IVehicleRepository)
        private readonly vehicleRepository: IVehicleRepository,
        @Inject(SymbolsCatalogs.ICatCategoryRepository)
        private readonly catCategoryRepository: ICatCategoryRepository,
        @Inject(SymbolsVehicleOwner.IVehicleOwnerRepository)
        private readonly vehicleOwnerRepository: IVehicleOwnerRepository,
        @Inject(SymbolsCatalogs.ICatModelRepository)
        private readonly catModelRepository: ICatModelRepository,
    ) { }

    async create(vehicle: ICreateVehicle): Promise<VehicleModel> {
        const { category, owner, model, ...rest } = vehicle;
        const vehicleModel = VehicleModel.create({ ...rest, isActive: true });

        const catCategory = await this.catCategoryRepository.findById(category);

        if (!catCategory) throw new BaseErrorException('Category not found', 404);

        vehicleModel.addCategory(catCategory);

        const vehicleOwner = await this.vehicleOwnerRepository.findById(owner);

        if (!vehicleOwner) throw new BaseErrorException('Owner not found', 404);

        vehicleModel.addOwner(vehicleOwner);

        const catModel = await this.catModelRepository.findById(model);

        if (!catModel) throw new BaseErrorException('Model not found', 404);

        vehicleModel.addModel(catModel);

        return this.vehicleRepository.create(vehicleModel);
    }

    async findByDate(query: any): Promise<VehicleModel[]> {
        return this.vehicleRepository.findByDate(query);
    }

    async findById(id: string): Promise<VehicleModel> {
        return this.vehicleRepository.findById(id);
    }

    async findAll(): Promise<VehicleModel[]> {
        return this.vehicleRepository.findAll();
    }

    async update(id: string, vehicle: IUpdateVehicle): Promise<VehicleModel> {
        const { category, owner, ...rest } = vehicle;
        const vehicleModel = VehicleModel.create(rest);

        const catCategory = await this.catCategoryRepository.findById(category);

        if (catCategory) vehicleModel.addCategory(catCategory);

        const vehicleOwner = await this.vehicleOwnerRepository.findById(owner);

        if (vehicleOwner) vehicleModel.addOwner(vehicleOwner);

        const catModel = await this.catModelRepository.findById(vehicle.model);

        if (catModel) vehicleModel.addModel(catModel);

        return this.vehicleRepository.update(id, vehicleModel);
    }

    async updateByModel(model: string, prices: IUpdatePriceByModel): Promise<void> {
        return this.vehicleRepository.updatePriceByModel(model, prices);
    }

    async updateReservation(vehicleId: string, originalEndDate: Date, newEndDate: Date): Promise<void> {
        return this.vehicleRepository.updateReservation(vehicleId, originalEndDate, newEndDate);
    }
}
