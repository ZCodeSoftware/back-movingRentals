import { TicketFiltersDTO } from "../../infrastructure/nest/dtos/ticket.dto";
import { TicketModel } from "../models/ticket.model";

export interface ITicketRepository {
    create(ticket: TicketModel): Promise<TicketModel>;
    findById(id: string): Promise<TicketModel>;
    findAll(filters: TicketFiltersDTO): Promise<TicketModel[]>
    update(id: string, ticket: TicketModel): Promise<TicketModel>
}
