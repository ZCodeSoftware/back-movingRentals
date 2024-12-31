import { TourModel } from "../models/tour.model";
import { ICreateTour, IUpdateTour } from "../types/tour.type";

export interface ITourService {
    create(tour: ICreateTour): Promise<TourModel>;
    findById(id: string): Promise<TourModel>;
    findAll(): Promise<TourModel[]>;
    update(id: string, tour: IUpdateTour)
}
