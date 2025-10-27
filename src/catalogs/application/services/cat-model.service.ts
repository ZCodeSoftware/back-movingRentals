import { Inject, Injectable } from "@nestjs/common";
import { CatModelModel } from "../../domain/models/cat-model.model";
import { ICatModelRepository } from "../../domain/repositories/cat-model.interface.repository";
import { ICatModelService } from "../../domain/services/cat-model.interface.service";
import { ICreateModel, IUpdateModel } from "../../domain/types/cat-model.type";
import SymbolsCatalogs from "../../symbols-catalogs";
import { IPromotionalPriceRepository } from "../../../promotional-price/domain/repositories/promotional-price.interface.repository";
import SymbolsPromotionalPrice from "../../../promotional-price/symbols-promotional-price";

@Injectable()
export class CatModelService implements ICatModelService {
    constructor(
        @Inject(SymbolsCatalogs.ICatModelRepository)
        private readonly catModelRepository: ICatModelRepository,
        @Inject(SymbolsPromotionalPrice.IPromotionalPriceRepository)
        private readonly promotionalPriceRepository: IPromotionalPriceRepository,
    ) { }

    async findAll(): Promise<CatModelModel[]> {
        const models = await this.catModelRepository.findAll();
        
        // Para cada modelo, obtener sus precios promocionales activos
        const modelsWithPromotions = await Promise.all(
            models.map(async (model) => {
                const modelId = model.toJSON()._id;
                const promotionalPrices = await this.promotionalPriceRepository.findAll({
                    model: modelId,
                    isActive: true,
                });
                
                // Agregar los precios promocionales al modelo
                if (promotionalPrices && promotionalPrices.length > 0) {
                    model.addPromotionalPrices(promotionalPrices.map(p => p.toJSON()));
                }
                
                return model;
            })
        );
        
        return modelsWithPromotions;
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