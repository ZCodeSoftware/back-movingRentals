import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CatModelModel } from "../../../domain/models/cat-model.model";
import { ICatModelRepository } from "../../../domain/repositories/cat-model.interface.repository";
import { CatModelSchema } from "../schemas/model.schema";



@Injectable()
export class CatModelRepository implements ICatModelRepository {
    constructor(
        @InjectModel("CatModel")
        private readonly catModelDB: Model<CatModelSchema>,
    ) { }

    async findById(id: string): Promise<CatModelModel | null> {
        const model = await this.catModelDB.findById(id);
        if (!model) return null;
        return CatModelModel.hydrate(model);
    }
}