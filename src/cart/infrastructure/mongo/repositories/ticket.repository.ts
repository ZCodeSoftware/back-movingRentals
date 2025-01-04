import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { TicketModel } from "../../../domain/models/ticket.model";
import { ITicketRepository } from "../../../domain/repositories/ticket.interface.repository";
import { TicketSchema } from "../schemas/ticket.schema";


@Injectable()
export class TicketRepository implements ITicketRepository {
    constructor(
        @InjectModel('Ticket') private readonly ticketDB: Model<TicketSchema>
    ) { }

    async findById(id: string): Promise<TicketModel> {
        const ticket = await this.ticketDB.findById(id).populate('category');
        if (!ticket) throw new BaseErrorException('Ticket not found', HttpStatus.NOT_FOUND);
        return TicketModel.hydrate(ticket);
    }
}
