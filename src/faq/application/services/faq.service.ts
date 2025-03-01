import { Inject, Injectable } from "@nestjs/common";
import { FaqModel } from "../../domain/models/faq.model";
import { IFaqRepository } from "../../domain/repositories/faq.interface.repository";
import { IFaqService } from "../../domain/services/faq.interface.service";
import { ICreateFaq } from "../../domain/types/faq.type";
import SymbolsFaq from "../../symbols-faq";

@Injectable()
export class FaqService implements IFaqService {
    constructor(
        @Inject(SymbolsFaq.IFaqRepository)
        private readonly faqRepository: IFaqRepository
    ) { }

    async create(faq: ICreateFaq): Promise<FaqModel> {
        const faqModel = FaqModel.create(faq);
        return this.faqRepository.create(faqModel);
    }

    async findById(id: string): Promise<FaqModel> {
        return this.faqRepository.findById(id);
    }

    async findAll(): Promise<FaqModel[]> {
        return this.faqRepository.findAll();
    }
}
