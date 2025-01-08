import { TicketModel } from "../models/ticket.model";
import { ICreateTicket } from "../types/ticket.type";

export interface ITicketService {
    create(ticket: ICreateTicket): Promise<TicketModel>;
    findById(id: string): Promise<TicketModel>;
    findAll(): Promise<TicketModel[]>;
    update(id: string, ticket: ICreateTicket): Promise<TicketModel>
}
