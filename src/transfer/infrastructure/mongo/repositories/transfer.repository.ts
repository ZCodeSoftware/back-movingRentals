import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { TRANSFER_RELATIONS } from "../../../../core/infrastructure/nest/constants/relations.constant";
import { TourFiltersDTO } from "../../../../tour/infrastructure/nest/dtos/tour.dto";
import { TransferModel } from "../../../domain/models/transfer.model";
import { ITransferRepository } from "../../../domain/repositories/transfer.interface.repository";
import { TransferSchema } from "../schemas/transfer.schema";

@Injectable()
export class TransferRepository implements ITransferRepository {
    constructor(
        @InjectModel('Transfer') private readonly transferDB: Model<TransferSchema>
    ) { }

    async create(transfer: TransferModel): Promise<TransferModel> {
        const schema = new this.transferDB(transfer.toJSON());
        const newTransfer = await schema.save();

        if (!newTransfer) throw new BaseErrorException(`Transfer shouldn't be created`, HttpStatus.BAD_REQUEST);

        return TransferModel.hydrate(newTransfer);
    }

    async findById(id: string): Promise<TransferModel> {
        const transfer = await this.transferDB.findById(id).populate('category');
        if (!transfer) throw new BaseErrorException('Transfer not found', HttpStatus.NOT_FOUND);
        return TransferModel.hydrate(transfer);
    }

    async findAll(filters: TourFiltersDTO): Promise<TransferModel[]> {
        const filter: any = {};
        if (filters?.isActive) {
            filter.isActive = filters.isActive;
        }
        const transfers = await this.transferDB.find(filter).populate('category');
        return transfers?.map(transfer => TransferModel.hydrate(transfer));
    }

    async update(id: string, transfer: TransferModel): Promise<TransferModel> {
        const updateObject = transfer.toJSON();

        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => {
                if (TRANSFER_RELATIONS.includes(key)) {
                    return value !== null && value !== undefined && typeof value === 'object' && '_id' in value;
                }
                return value !== null && value !== undefined;
            })
        );

        const updatedTransfer = await this.transferDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true, omitUndefined: true }).populate('category');

        if (!updatedTransfer) throw new BaseErrorException('Transfer not found', HttpStatus.NOT_FOUND);

        return TransferModel.hydrate(updatedTransfer)
    }
}
