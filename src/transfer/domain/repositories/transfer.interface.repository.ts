import { TourFiltersDTO } from "../../../tour/infrastructure/nest/dtos/tour.dto";
import { TransferModel } from "../models/transfer.model";

export interface ITransferRepository {
    create(transfer: TransferModel): Promise<TransferModel>;
    findById(id: string): Promise<TransferModel>;
    findAll(filters: TourFiltersDTO): Promise<TransferModel[]>
    update(id: string, transfer: TransferModel): Promise<TransferModel>
    softDelete(id: string): Promise<void>;
}
