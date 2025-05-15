import { CarouselModel } from "../models/carousel.model";

export interface ICarouselRepository {
    create(carousel: CarouselModel): Promise<CarouselModel>;
    delete(id: string): Promise<void>;
}