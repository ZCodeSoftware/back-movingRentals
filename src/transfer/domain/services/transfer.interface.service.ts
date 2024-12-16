import { TransferModel } from "../models/transfer.model";
import { ICreateTransfer } from "../types/transfer.type";

export interface ITransferService {
    create(transfer: ICreateTransfer): Promise<TransferModel>;
    findById(id: string): Promise<TransferModel>;
    findAll(): Promise<TransferModel[]>;
}
