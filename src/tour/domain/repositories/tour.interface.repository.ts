import { TourModel } from "../models/tour.model";

export interface ITourRepository {
    create(tour: TourModel): Promise<TourModel>;
    findById(id: string): Promise<TourModel>;
    findAll(): Promise<TourModel[]>;
}
