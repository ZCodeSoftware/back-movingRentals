import { TourModel } from "../models/tour.model";
import { ICreateTour } from "../types/tour.type";

export interface ITourService {
    create(tour: ICreateTour): Promise<TourModel>;
    findById(id: string): Promise<TourModel>;
    findAll(): Promise<TourModel[]>;
}
