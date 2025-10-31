import { Inject, Injectable } from "@nestjs/common";
import SymbolsBranches from "../../../branches/symbols-branches";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import SymbolsTicket from "../../../ticket/symbols-ticket";
import SymbolsTour from "../../../tour/symbols-tour";
import SymbolsTransfer from "../../../transfer/symbols-transfer";
import SymbolsUser from "../../../user/symbols-user";
import SymbolsVehicle from "../../../vehicle/symbols-vehicle";
import { CartModel } from "../../domain/models/cart.model";
import { IBranchesRepository } from "../../domain/repositories/branches.interface.repository";
import { ICartRepository } from "../../domain/repositories/cart.interface.repository";
import { ITicketRepository } from "../../domain/repositories/ticket.interface.repository";
import { ITourRepository } from "../../domain/repositories/tour.interface.repository";
import { ITransferRepository } from "../../domain/repositories/transfer.interface.repository";
import { IUserRepository } from "../../domain/repositories/user.interface.repository";
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
        @Inject(SymbolsTicket.ITicketRepository)
        private readonly ticketRepository: ITicketRepository,
        @Inject(SymbolsUser.IUserRepository)
        private readonly userRepository: IUserRepository,
    ) { }

    async update(id: string, data: UpdateCartDTO): Promise<CartModel> {
        const { branch, transfer, selectedItems, selectedTours, selectedTickets, delivery, deliveryAddress, ...rest } = data;

        const branchModel = branch && branch !== "" && await this.branchesRepository.findById(branch);

        if (!branchModel && (selectedItems?.length || selectedTours?.length)) {
            throw new BaseErrorException('Branch not found', 404);
        }

        const tours = selectedTours && await Promise.all(selectedTours?.map(async (t) => {
            const tourModel = await this.tourRepository.findById(t.tour);
            if (!tourModel) throw new BaseErrorException('Tour not found', 404);
            return {
                tour: tourModel,
                date: t.date,
                passengers: t.passengers,
                quantity: t.quantity,
                total: t.total // Incluir total si viene en el item
            };
        }))

        const tickets = selectedTickets && await Promise.all(selectedTickets?.map(async (t) => {
            const ticketModel = await this.ticketRepository.findById(t.ticket);
            if (!ticketModel) throw new BaseErrorException('Ticket not found', 404);
            console.log('[CartService] Ticket input:', JSON.stringify(t, null, 2));
            const result = { 
                ticket: ticketModel, 
                date: t.date, 
                quantity: t.quantity, 
                passengers: t.passengers,
                total: t.total // Incluir total si viene en el item
            };
            console.log('[CartService] Ticket result:', JSON.stringify(result, null, 2));
            return result;
        }))

        const vehicles = selectedItems && await Promise.all(selectedItems?.map(async (i) => {
            const vehicleModel = await this.vehicleRepository.findById(i.vehicle);
            if (!vehicleModel) throw new BaseErrorException('Vehicle not found', 404);
            return {
                vehicle: vehicleModel,
                dates: i.dates,
                total: i.total,
                passengers: i.passengers,
                delivery: (i as any).delivery // Incluir delivery si viene en el item
            };
        }))

        const transfers = transfer && await Promise.all(transfer?.map(async (t) => {
            const transferModel = await this.transferRepository.findById(t.transfer);
            console.log('[CartService] Transfer input:', JSON.stringify(t, null, 2));
            const result = { 
                transfer: transferModel, 
                date: t.date, 
                passengers: t.passengers, 
                quantity: t.quantity,
                total: t.total // Incluir total si viene en el item
            };
            console.log('[CartService] Transfer result:', JSON.stringify(result, null, 2));
            return result;
        }))

        // Validate delivery vs address constraint
        if (delivery === true && (!deliveryAddress || deliveryAddress.trim() === '')) {
            throw new BaseErrorException('Delivery address is required when delivery is true', 400);
        }

        const cart = await this.cartRepository.update(id, {
            branch: branchModel ? branchModel : null,
            tours: tours ?? [],
            vehicles: vehicles ?? [],
            transfer: transfers ?? [],
            tickets: tickets ?? [],
            delivery: delivery ?? false,
            deliveryAddress: deliveryAddress ?? null,
            ...rest
        });

        return cart;
    }

    async findById(id: string): Promise<CartModel> {
        return this.cartRepository.findById(id);
    }

    async updateByEmail(email: string, data: UpdateCartDTO): Promise<CartModel> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new BaseErrorException('User not found', 404);
        }

        const cart = await this.cartRepository.findById(user.toJSON().cart);
        if (!cart) {
            throw new BaseErrorException('Cart not found', 404);
        }

        return this.update(cart.id.toString(), data);
    }
}
