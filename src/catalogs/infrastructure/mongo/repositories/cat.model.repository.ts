import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CatModelModel } from "../../../domain/models/cat-model.model";
import { ICatModelRepository } from "../../../domain/repositories/cat-model.interface.repository";
import { CatModelSchema } from "../schemas/cat-model.schema";

@Injectable()
export class CatModelRepository implements ICatModelRepository {
    constructor(
        @InjectModel('CatModel')
        private readonly catModelDB: Model<CatModelSchema>,
    ) { }

    async findAll(): Promise<CatModelModel[]> {
        const models = await this.catModelDB.find();
        return models?.map((model) => CatModelModel.hydrate(model));
    }

    async findById(id: string): Promise<CatModelModel> {
        const model = await this.catModelDB.findById(id);
        if (!model) throw new BaseErrorException('Category not found', HttpStatus.NOT_FOUND);
        return CatModelModel.hydrate(model);
    }

    async create(catModel: CatModelModel): Promise<CatModelModel> {
        const schema = new this.catModelDB(catModel.toJSON());

        const saved = await schema.save();

        if (!saved) {
            throw new BaseErrorException(
                `Model shouldn't be created`,
                HttpStatus.BAD_REQUEST,
            );
        }

        return CatModelModel.hydrate(saved);
    }
}