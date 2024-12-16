import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
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

    async findAll(): Promise<TransferModel[]> {
        const transfers = await this.transferDB.find().populate('category');
        return transfers?.map(transfer => TransferModel.hydrate(transfer));
    }
}
