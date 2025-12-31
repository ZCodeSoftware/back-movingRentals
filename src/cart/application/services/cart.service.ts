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
            
            // VALIDAR DISPONIBILIDAD DEL VEHÍCULO PARA LAS FECHAS SELECCIONADAS
            if (i.dates && i.dates.start && i.dates.end) {
                const vehicleData = vehicleModel.toJSON() as any;
                const requestedStart = new Date(i.dates.start);
                const requestedEnd = new Date(i.dates.end);
                
                // Verificar si el vehículo tiene reservas que se solapen con las fechas solicitadas
                if (vehicleData.reservations && Array.isArray(vehicleData.reservations) && vehicleData.reservations.length > 0) {
                    const hasConflict = vehicleData.reservations.some((reservation: any) => {
                        const reservationStart = new Date(reservation.start).getTime();
                        const reservationEnd = new Date(reservation.end).getTime();
                        const requestedStartTime = requestedStart.getTime();
                        const requestedEndTime = requestedEnd.getTime();

                        // Verificar si hay solapamiento de fechas
                        return (
                            (requestedStartTime >= reservationStart && requestedStartTime < reservationEnd) ||
                            (requestedEndTime > reservationStart && requestedEndTime <= reservationEnd) ||
                            (requestedStartTime <= reservationStart && requestedEndTime >= reservationEnd)
                        );
                    });

                    if (hasConflict) {
                        const vehicleName = vehicleData.name || 'Vehículo';
                        const categoryName = (vehicleData.category && typeof vehicleData.category === 'object' && 'name' in vehicleData.category) 
                            ? vehicleData.category.name 
                            : 'esta categoría';
                        throw new BaseErrorException(
                            `El vehículo "${vehicleName}" no está disponible para las fechas seleccionadas (${requestedStart.toLocaleDateString()} - ${requestedEnd.toLocaleDateString()}). Por favor, selecciona otro vehículo de ${categoryName} o cambia las fechas.`,
                            409, // 409 Conflict
                        );
                    }
                }
            }
            
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
                total: t.total, // Incluir total si viene en el item
                airline: t.airline, // Incluir aerolínea
                flightNumber: t.flightNumber // Incluir número de vuelo
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
