import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { TICKET_RELATIONS } from "../../../../core/infrastructure/nest/constants/relations.constant";
import { TicketModel } from "../../../domain/models/ticket.model";
import { ITicketRepository } from "../../../domain/repositories/ticket.interface.repository";
import { TicketFiltersDTO } from "../../nest/dtos/ticket.dto";
import { TicketSchema } from "../schemas/ticket.schema";

@Injectable()
export class TicketRepository implements ITicketRepository {
    constructor(
        @InjectModel('Ticket') private readonly ticketDB: Model<TicketSchema>
    ) { }

    async create(ticket: TicketModel): Promise<TicketModel> {
        const schema = new this.ticketDB(ticket.toJSON());
        const newTicket = await schema.save();

        if (!newTicket) throw new BaseErrorException(`Ticket shouldn't be created`, HttpStatus.BAD_REQUEST);

        return TicketModel.hydrate(newTicket);
    }

    async findById(id: string): Promise<TicketModel> {
        const ticket = await this.ticketDB.findById(id).populate('category');
        if (!ticket) throw new BaseErrorException('Ticket not found', HttpStatus.NOT_FOUND);
        return TicketModel.hydrate(ticket);
    }

    async findAll(filters: TicketFiltersDTO): Promise<TicketModel[]> {
        const filter: any = {};
        if (filters?.isActive) {
            filter.isActive = filters.isActive;
        }
        const tickets = await this.ticketDB.find(filter).populate('category');
        return tickets?.map(ticket => TicketModel.hydrate(ticket));
    }

    async update(id: string, ticket: TicketModel): Promise<TicketModel> {
        const updateObject = ticket.toJSON();

        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => {
                if (TICKET_RELATIONS.includes(key)) {
                    return value !== null && value !== undefined && typeof value === 'object' && '_id' in value;
                }
                return value !== null && value !== undefined;
            })
        );

        const updatedTicket = await this.ticketDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true, omitUndefined: true }).populate('category');

        if (!updatedTicket) throw new BaseErrorException('Ticket not found', HttpStatus.NOT_FOUND);

        return TicketModel.hydrate(updatedTicket);
    }

    async softDelete(id: string): Promise<void> {
        const updated = await this.ticketDB.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!updated) throw new BaseErrorException('Ticket not found', HttpStatus.NOT_FOUND);
    }
}
