import { Inject, Injectable } from "@nestjs/common";
import { CatModelModel } from "../../domain/models/cat-model.model";
import { ICatModelRepository } from "../../domain/repositories/cat-model.interface.repository";
import { ICatModelService } from "../../domain/services/cat-model.interface.service";
import { ICreateModel, IUpdateModel } from "../../domain/types/cat-model.type";
import SymbolsCatalogs from "../../symbols-catalogs";

@Injectable()
export class CatModelService implements ICatModelService {
    constructor(
        @Inject(SymbolsCatalogs.ICatModelRepository)
        private readonly catModelRepository: ICatModelRepository,
    ) { }

    async findAll(): Promise<CatModelModel[]> {
        return this.catModelRepository.findAll();
    }

    async findById(id: string): Promise<CatModelModel> {
        return this.catModelRepository.findById(id);
    }

    async create(model: ICreateModel): Promise<CatModelModel> {
        const modelModel = CatModelModel.create({ name: model.name });
        return this.catModelRepository.create(modelModel);
    }

    async update(id: string, model: IUpdateModel): Promise<CatModelModel> {
        const modelModel = CatModelModel.create({ name: model.name });
        return this.catModelRepository.update(id, modelModel);
    }
}