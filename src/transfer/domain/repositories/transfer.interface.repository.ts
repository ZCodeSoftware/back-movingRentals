import { TransferModel } from "../models/transfer.model";

export interface ITransferRepository {
    create(transfer: TransferModel): Promise<TransferModel>;
    findById(id: string): Promise<TransferModel>;
    findAll(): Promise<TransferModel[]>;
    update(id: string, transfer: TransferModel): Promise<TransferModel>
}
