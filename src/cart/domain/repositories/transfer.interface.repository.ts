import { TransferModel } from "../models/transfer.model";

export interface ITransferRepository {
    findById(id: string): Promise<TransferModel>;
}
