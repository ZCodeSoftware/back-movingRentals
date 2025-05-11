import { TicketModel } from "../models/ticket.model";
import { ICreateTicket, IFilters } from "../types/ticket.type";

export interface ITicketService {
    create(ticket: ICreateTicket): Promise<TicketModel>;
    findById(id: string): Promise<TicketModel>;
    findAll(filters: IFilters): Promise<TicketModel[]>
    update(id: string, ticket: ICreateTicket): Promise<TicketModel>
}
