import { Inject, Injectable } from "@nestjs/common";
import { ChoosingModel } from "../../domain/models/choosing.model";
import { IChoosingRepository } from "../../domain/repositories/choosing.interface.repository";
import { IChoosingService } from "../../domain/services/choosing.interface.service";
import { ICreateChoosing } from "../../domain/types/choosing.type";
import SymbolsChoosing from "../../symbols-choosing";

@Injectable()
export class ChoosingService implements IChoosingService {
    constructor(
        @Inject(SymbolsChoosing.IChoosingRepository)
        private readonly choosingRepository: IChoosingRepository
    ) { }

    async create(choosing: ICreateChoosing): Promise<ChoosingModel> {
        const choosingModel = ChoosingModel.create(choosing);
        return this.choosingRepository.create(choosingModel);
    }

    async findById(id: string): Promise<ChoosingModel> {
        return this.choosingRepository.findById(id);
    }

    async findAll(): Promise<ChoosingModel[]> {
        return this.choosingRepository.findAll();
    }
}
