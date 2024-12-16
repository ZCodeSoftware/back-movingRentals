import { Inject, Injectable } from "@nestjs/common";
import SymbolsCatalogs from "../../../catalogs/symbols-catalogs";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { TransferModel } from "../../domain/models/transfer.model";
import { ICatCategoryRepository } from "../../domain/repositories/cat-category.interface.repository";
import { ITransferRepository } from "../../domain/repositories/transfer.interface.repository";
import { ITransferService } from "../../domain/services/transfer.interface.service";
import { ICreateTransfer } from "../../domain/types/transfer.type";
import SymbolsTransfer from "../../symbols-transfer";

@Injectable()
export class TransferService implements ITransferService {
    constructor(
        @Inject(SymbolsTransfer.ITransferRepository)
        private readonly transferRepository: ITransferRepository,
        @Inject(SymbolsCatalogs.ICatCategoryRepository)
        private readonly catCategoryRepository: ICatCategoryRepository
    ) { }

    async create(transfer: ICreateTransfer): Promise<TransferModel> {
        const { category, ...rest } = transfer;

        const categoryModel = await this.catCategoryRepository.findById(category);

        if (!categoryModel) {
            throw new BaseErrorException('Category not found', 404);
        }

        const transferModel = TransferModel.create(rest);

        transferModel.addCategory(categoryModel);

        return this.transferRepository.create(transferModel);
    }

    async findById(id: string): Promise<TransferModel> {
        return this.transferRepository.findById(id);
    }

    async findAll(): Promise<TransferModel[]> {
        return this.transferRepository.findAll();
    }
}
