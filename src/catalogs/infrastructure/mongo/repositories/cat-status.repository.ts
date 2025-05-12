import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CatStatusModel } from "../../../domain/models/cat-status.model";
import { ICatStatusRepository } from "../../../domain/repositories/cat-status.interface.repository";
import { CatStatusSchema } from "../schemas/cat-status.schema";

@Injectable()
export class CatStatusRepository implements ICatStatusRepository {
    constructor(
        @InjectModel('CatStatus') private readonly catStatusDB: Model<CatStatusSchema>
    ) { }

    async create(catStatus: CatStatusModel): Promise<CatStatusModel> {
        const schema = new this.catStatusDB(catStatus.toJSON());
        const newCatStatus = await schema.save();

        if (!newCatStatus) throw new Error(`CatStatus shouldn't be created`);

        return CatStatusModel.hydrate(newCatStatus);
    }

    async findById(id: string): Promise<CatStatusModel> {
        const catStatus = await this.catStatusDB.findById(id);
        if (!catStatus) return null;
        return CatStatusModel.hydrate(catStatus);
    }

    async findAll(): Promise<CatStatusModel[]> {
        const catStatus = await this.catStatusDB.find();
        if (!catStatus) return [];
        return catStatus.map((catStatus) => CatStatusModel.hydrate(catStatus));
    }

    async findByName(name: string): Promise<CatStatusModel> {
        const catStatus = await this.catStatusDB.findOne({ name });
        if (!catStatus) return null;
        return CatStatusModel.hydrate(catStatus);
    }
}