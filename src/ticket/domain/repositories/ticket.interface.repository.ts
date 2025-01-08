import { TicketModel } from "../models/ticket.model";

export interface ITicketRepository {
    create(ticket: TicketModel): Promise<TicketModel>;
    findById(id: string): Promise<TicketModel>;
    findAll(): Promise<TicketModel[]>;
    update(id: string, ticket: TicketModel): Promise<TicketModel>
}
