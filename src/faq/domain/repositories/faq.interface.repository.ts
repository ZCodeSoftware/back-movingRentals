import { FaqModel } from "../models/faq.model";

export interface IFaqRepository {
    create(faq: FaqModel): Promise<FaqModel>;
    findById(id: string): Promise<FaqModel>;
    findAll(): Promise<FaqModel[]>;
}
