import { Inject, Injectable } from "@nestjs/common";
import SymbolsBranches from "../../../branches/symbols-branches";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import SymbolsTour from "../../../tour/symbols-tour";
import SymbolsTransfer from "../../../transfer/symbols-transfer";
import SymbolsVehicle from "../../../vehicle/symbols-vehicle";
import { CartModel } from "../../domain/models/cart.model";
import { IBranchesRepository } from "../../domain/repositories/branches.interface.repository";
import { ICartRepository } from "../../domain/repositories/cart.interface.repository";
import { ITourRepository } from "../../domain/repositories/tour.interface.repository";
import { ITransferRepository } from "../../domain/repositories/transfer.interface.repository";
import { IVehicleRepository } from "../../domain/repositories/vehicle.interface.repository";
import { ICartService } from "../../domain/services/cart.interface.service";
import { UpdateCartDTO } from "../../infrastructure/nest/dtos/cart.dto";
import SymbolsCart from "../../symbols-cart";

@Injectable()
export class CartService implements ICartService {
    constructor(
        @Inject(SymbolsCart.ICartRepository)
        private readonly cartRepository: ICartRepository,
        @Inject(SymbolsBranches.IBranchesRepository)
        private readonly branchesRepository: IBranchesRepository,
        @Inject(SymbolsTour.ITourRepository)
        private readonly tourRepository: ITourRepository,
        @Inject(SymbolsVehicle.IVehicleRepository)
        private readonly vehicleRepository: IVehicleRepository,
        @Inject(SymbolsTransfer.ITransferRepository)
        private readonly transferRepository: ITransferRepository,
    ) { }

    async update(id: string, data: UpdateCartDTO): Promise<CartModel> {
        const { branch, transfer, selectedItems, selectedTours, ...rest } = data;

        const branchModel = branch && await this.branchesRepository.findById(branch);

        if (!branchModel && (selectedItems.length || selectedTours.length)) {
            throw new BaseErrorException('Branch not found', 404);
        }

        const tours = selectedTours && await Promise.all(selectedTours?.map(async (t) => {
            const tourModel = await this.tourRepository.findById(t.tour);
            if (!tourModel) throw new BaseErrorException('Tour not found', 404);
            return {
                tour: tourModel,
                date: t.date
            };
        }))

        const vehicles = selectedItems && await Promise.all(selectedItems?.map(async (i) => {
            const vehicleModel = await this.vehicleRepository.findById(i.vehicle);
            if (!vehicleModel) throw new BaseErrorException('Vehicle not found', 404);
            return {
                vehicle: vehicleModel,
                dates: i.dates,
                total: i.total
            };
        }))

        const transfers = transfer && await Promise.all(transfer?.map(async (t) => {
            const transferModel = await this.transferRepository.findById(t.transfer);
            return { transfer: transferModel, date: t.date };
        }))

        const cart = await this.cartRepository.update(id, {
            branch: branchModel ?? null,
            tours: tours ?? [],
            vehicles: vehicles ?? [],
            transfer: transfers ?? [],
            ...rest
        });

        return cart;
    }

    async findById(id: string): Promise<CartModel> {
        return this.cartRepository.findById(id);
    }
}
