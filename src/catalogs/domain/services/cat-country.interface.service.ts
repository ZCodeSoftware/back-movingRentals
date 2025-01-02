import { CatCountryModel } from "../models/cat-country.model";

export interface ICatCountryService {
    findAll(): Promise<CatCountryModel[]>;
    findById(catCountryId: string): Promise<CatCountryModel>;
}