import { Inject, Injectable } from "@nestjs/common";
import SymbolsCatalogs from "../../../catalogs/symbols-catalogs";
import { TourModel } from "../../domain/models/tour.model";
import { ICatCategoryRepository } from "../../domain/repositories/cat-category.interface.repository";
import { ITourRepository } from "../../domain/repositories/tour.interface.repository";
import { ITourService } from "../../domain/services/tour.interface.service";
import { ICreateTour, IFilters, IUpdateTour } from "../../domain/types/tour.type";
import SymbolsTour from "../../symbols-tour";

@Injectable()
export class TourService implements ITourService {
    constructor(
        @Inject(SymbolsTour.ITourRepository)
        private readonly tourRepository: ITourRepository,
        @Inject(SymbolsCatalogs.ICatCategoryRepository)
        private readonly catCategoryRepository: ICatCategoryRepository
    ) { }

    async create(tour: ICreateTour): Promise<TourModel> {
        const { category, ...rest } = tour;
        const tourModel = TourModel.create({ ...rest, isActive: true });

        const categoryModel = await this.catCategoryRepository.findById(category);

        if (!categoryModel) {
            throw new Error('Category not found');
        }

        tourModel.addCategory(categoryModel);

        return this.tourRepository.create(tourModel);
    }

    async findById(id: string): Promise<TourModel> {
        return this.tourRepository.findById(id);
    }

    async findAll(filters: IFilters): Promise<TourModel[]> {
        return this.tourRepository.findAll(filters);
    }

    async update(id: string, tour: IUpdateTour): Promise<TourModel> {
        const { category, ...rest } = tour;
        const tourModel = TourModel.create(rest);

        const categoryModel = await this.catCategoryRepository.findById(category);

        if (categoryModel) tourModel.addCategory(categoryModel);

        return this.tourRepository.update(id, tourModel);
    }

    async delete(id: string): Promise<void> {
        return this.tourRepository.softDelete(id);
    }
}
