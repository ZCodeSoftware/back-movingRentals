import { TourModel } from "../models/tour.model";
import { ICreateTour, IFilters, IUpdateTour } from "../types/tour.type";

export interface ITourService {
    create(tour: ICreateTour): Promise<TourModel>;
    findById(id: string): Promise<TourModel>;
    findAll(filters: IFilters): Promise<TourModel[]>
    update(id: string, tour: IUpdateTour)
    delete(id: string): Promise<void>;
}
