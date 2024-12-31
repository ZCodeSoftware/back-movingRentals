import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { TOUR_RELATIONS } from "../../../../core/infrastructure/nest/constants/relations.constant";
import { TourModel } from "../../../domain/models/tour.model";
import { ITourRepository } from "../../../domain/repositories/tour.interface.repository";
import { TourSchema } from "../schemas/tour.schema";

@Injectable()
export class TourRepository implements ITourRepository {
    constructor(
        @InjectModel('Tour') private readonly tourDB: Model<TourSchema>
    ) { }

    async create(tour: TourModel): Promise<TourModel> {
        const schema = new this.tourDB(tour.toJSON());
        const newTour = await schema.save();

        if (!newTour) throw new BaseErrorException(`Tour shouldn't be created`, HttpStatus.BAD_REQUEST);

        return TourModel.hydrate(newTour);
    }

    async findById(id: string): Promise<TourModel> {
        const tour = await this.tourDB.findById(id).populate('category');
        if (!tour) throw new BaseErrorException('Tour not found', HttpStatus.NOT_FOUND);
        return TourModel.hydrate(tour);
    }

    async findAll(): Promise<TourModel[]> {
        const tours = await this.tourDB.find().populate('category');
        return tours?.map(tour => TourModel.hydrate(tour));
    }

    async update(id: string, tour: TourModel): Promise<TourModel> {
        const updateObject = tour.toJSON();

        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => {
                if (TOUR_RELATIONS.includes(key)) {
                    return value !== null && value !== undefined && typeof value === 'object' && '_id' in value;
                }
                return value !== null && value !== undefined;
            })
        );

        const updatedTour = await this.tourDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true, omitUndefined: true }).populate('category');

        if (!updatedTour) throw new BaseErrorException('Tour not found', HttpStatus.NOT_FOUND);

        return TourModel.hydrate(updatedTour);
    }

}
