import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { ChoosingModel } from "../../../domain/models/choosing.model";
import { IChoosingRepository } from "../../../domain/repositories/choosing.interface.repository";
import { ChoosingSchema } from "../schemas/choosing.schema";

@Injectable()
export class ChoosingRepository implements IChoosingRepository {
    constructor(
        @InjectModel('Choosing') private readonly choosingDB: Model<ChoosingSchema>
    ) { }

    async create(choosing: ChoosingModel): Promise<ChoosingModel> {
        const schema = new this.choosingDB(choosing.toJSON());
        const newChoosing = await schema.save();

        if (!newChoosing) throw new BaseErrorException(`Choosing shouldn't be created`, HttpStatus.BAD_REQUEST);

        return ChoosingModel.hydrate(newChoosing);
    }

    async findById(id: string): Promise<ChoosingModel> {
        const choosing = await this.choosingDB.findById(id);
        if (!choosing) throw new BaseErrorException('Choosing not found', HttpStatus.NOT_FOUND);
        return ChoosingModel.hydrate(choosing);
    }

    async findAll(): Promise<ChoosingModel[]> {
        const choosings = await this.choosingDB.find();
        return choosings?.map(choosing => ChoosingModel.hydrate(choosing));
    }
}
