import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { FaqModel } from "../../../domain/models/faq.model";
import { IFaqRepository } from "../../../domain/repositories/faq.interface.repository";
import { FaqSchema } from "../schemas/faq.schema";

@Injectable()
export class FaqRepository implements IFaqRepository {
    constructor(
        @InjectModel('Faq') private readonly faqDB: Model<FaqSchema>
    ) { }

    async create(faq: FaqModel): Promise<FaqModel> {
        const schema = new this.faqDB(faq.toJSON());
        const newFaq = await schema.save();

        if (!newFaq) throw new BaseErrorException(`Faq shouldn't be created`, HttpStatus.BAD_REQUEST);

        return FaqModel.hydrate(newFaq);
    }

    async findById(id: string): Promise<FaqModel> {
        const faq = await this.faqDB.findById(id);
        if (!faq) throw new BaseErrorException('Faq not found', HttpStatus.NOT_FOUND);
        return FaqModel.hydrate(faq);
    }

    async findAll(): Promise<FaqModel[]> {
        const faqs = await this.faqDB.find();
        return faqs?.map(faq => FaqModel.hydrate(faq));
    }
}
