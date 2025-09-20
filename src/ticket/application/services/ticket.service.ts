import { Inject, Injectable } from "@nestjs/common";
import SymbolsCatalogs from "../../../catalogs/symbols-catalogs";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { TicketModel } from "../../domain/models/ticket.model";
import { ICatCategoryRepository } from "../../domain/repositories/cat-category.interface.repository";
import { ITicketRepository } from "../../domain/repositories/ticket.interface.repository";
import { ITicketService } from "../../domain/services/ticket.interface.service";
import { ICreateTicket, IFilters, IUpdateTicket } from "../../domain/types/ticket.type";
import SymbolsTicket from "../../symbols-ticket";

@Injectable()
export class TicketService implements ITicketService {
    constructor(
        @Inject(SymbolsTicket.ITicketRepository)
        private readonly ticketRepository: ITicketRepository,
        @Inject(SymbolsCatalogs.ICatCategoryRepository)
        private readonly catCategoryRepository: ICatCategoryRepository,
    ) { }

    async create(ticket: ICreateTicket): Promise<TicketModel> {
        const { category, ...rest } = ticket;
        const ticketModel = TicketModel.create({ ...rest, isActive: true });

        const categoryModel = await this.catCategoryRepository.findById(category);

        if (!categoryModel) throw new BaseErrorException('Category not found', 404);

        ticketModel.addCategory(categoryModel);

        return this.ticketRepository.create(ticketModel);
    }

    async findById(id: string): Promise<TicketModel> {
        return this.ticketRepository.findById(id);
    }

    async findAll(filters: IFilters): Promise<TicketModel[]> {
        return this.ticketRepository.findAll(filters);
    }

    async update(id: string, ticket: IUpdateTicket): Promise<TicketModel> {
        const { category, ...rest } = ticket;
        const ticketModel = TicketModel.create(rest);

        const categoryModel = await this.catCategoryRepository.findById(category);

        if (categoryModel) ticketModel.addCategory(categoryModel);

        return this.ticketRepository.update(id, ticketModel);
    }

    async delete(id: string): Promise<void> {
        return this.ticketRepository.softDelete(id);
    }
}
