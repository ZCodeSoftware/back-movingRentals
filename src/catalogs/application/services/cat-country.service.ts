import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { CatCountryModel } from "../../domain/models/cat-country.model";
import { ICatCountryRepository } from "../../domain/repositories/cat-country.interface.repository";
import { ICatCountryService } from "../../domain/services/cat-country.interface.service";
import SymbolsCatalogs from "../../symbols-catalogs";

@Injectable()
export class CatCountryService implements ICatCountryService {
    constructor(
        @Inject(SymbolsCatalogs.ICatCountryRepository)
        private readonly catCountryRepository: ICatCountryRepository,
        private readonly httpService: HttpService
    ) { }

    async findAll(): Promise<CatCountryModel[]> {
        return await this.catCountryRepository.findAll();
    }

    async findById(catCountryId: string): Promise<CatCountryModel> {
        return await this.catCountryRepository.findById(catCountryId);
    }
}