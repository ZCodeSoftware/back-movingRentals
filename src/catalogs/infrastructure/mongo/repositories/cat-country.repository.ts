import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CatCountryModel } from "../../../domain/models/cat-country.model";
import { ICatCountryRepository } from "../../../domain/repositories/cat-country.interface.repository";
import { CatCountrySchema } from "../schemas/cat-country.schema";

@Injectable()
export class CatCountryRepository implements ICatCountryRepository {
    constructor(
        @InjectModel('CatCountry')
        private readonly catCountryModel: Model<CatCountrySchema>,
    ) { }

    async findAll(): Promise<CatCountryModel[]> {
        const countries = await this.catCountryModel.find().sort({ nameEn: 1 });
        return countries?.map(c => CatCountryModel.hydrate(c));
    }

    async findById(catCountryId: string): Promise<CatCountryModel> {
        const country = await this.catCountryModel.findById(catCountryId);

        if (!country) throw new BaseErrorException('country not found', 404);

        return CatCountryModel.hydrate(country);
    }
}