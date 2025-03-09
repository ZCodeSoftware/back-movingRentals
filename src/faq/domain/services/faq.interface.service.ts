import { FaqModel } from "../models/faq.model";
import { ICreateFaq } from "../types/faq.type";

export interface IFaqService {
    create(faq: ICreateFaq): Promise<FaqModel>;
    findById(id: string): Promise<FaqModel>;
    findAll(): Promise<FaqModel[]>;
}
