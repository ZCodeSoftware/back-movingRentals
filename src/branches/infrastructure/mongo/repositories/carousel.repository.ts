import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CarouselModel } from "../../../domain/models/carousel.model";
import { ICarouselRepository } from "../../../domain/repositories/carousel.interface.repository";

@Injectable()
export class CarouselRepository implements ICarouselRepository {
    constructor(
        @InjectModel("Carousel") private readonly carouselModel: Model<CarouselModel>,
    ) { }
    async create(carousel: CarouselModel): Promise<CarouselModel> {
        const schema = new this.carouselModel(carousel.toJSON());
        const newCarousel = await schema.save();

        if (!newCarousel) throw new BaseErrorException(`Carousel shouldn't be created`, HttpStatus.BAD_REQUEST);
        return CarouselModel.hydrate(newCarousel);
    }

    async delete(id: string): Promise<void> {
        // Implement the logic to delete a carousel from the database
    }
}