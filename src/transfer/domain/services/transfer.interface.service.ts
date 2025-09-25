import { TransferModel } from "../models/transfer.model";
import { ICreateTransfer, IFilters, IUpdateTransfer } from "../types/transfer.type";

export interface ITransferService {
    create(transfer: ICreateTransfer): Promise<TransferModel>;
    findById(id: string): Promise<TransferModel>;
    findAll(filters: IFilters): Promise<TransferModel[]>
    update(id: string, transfer: IUpdateTransfer): Promise<TransferModel>
    delete(id: string): Promise<void>;
}
