import { TicketModel } from "../models/ticket.model";

export interface ITicketRepository {
    findById(id: string): Promise<TicketModel>;
}
