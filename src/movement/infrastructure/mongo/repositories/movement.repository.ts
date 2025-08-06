import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { MovementModel } from "../../../domain/models/movement.model";
import { IMovementRepository } from "../../../domain/repositories/movement.interface.repository";
import { MovementSchema } from "../schemas/movement.schema";

@Injectable()
export class MovementRepository implements IMovementRepository {
    constructor(
        @InjectModel('Movement') private readonly movementDB: Model<MovementSchema>
    ) { }

    async create(movement: MovementModel): Promise<MovementModel> {
        const schema = new this.movementDB(movement.toJSON());
        const newMovement = await schema.save();

        if (!newMovement) throw new BaseErrorException(`Movement shouldn't be created`, HttpStatus.BAD_REQUEST);

        // Populate the created movement with user and role data
        const populatedMovement = await this.movementDB.findById(newMovement._id).populate({
            path: 'createdBy',
            populate: {
                path: 'role'
            }
        });

        return MovementModel.hydrate(populatedMovement);
    }

    async findById(id: string): Promise<MovementModel> {
        const movement = await this.movementDB.findById(id).populate({
            path: 'createdBy',
            populate: {
                path: 'role'
            }
        });
        if (!movement) throw new BaseErrorException('Movement not found', HttpStatus.NOT_FOUND);
        return MovementModel.hydrate(movement);
    }

    async findAll(filters: any): Promise<{
        data: MovementModel[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }> {
        const { page = 1, limit = 10 } = filters;

        const pageNumber = parseInt(page as string, 10) || 1;
        const limitNumber = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        // Remove pagination parameters from filters
        const searchFilters = { ...filters };
        delete searchFilters.page;
        delete searchFilters.limit;

        const [movements, totalItems] = await Promise.all([
            this.movementDB.find(searchFilters).skip(skip).limit(limitNumber).populate({
                path: 'createdBy',
                populate: {
                    path: 'role'
                }
            }),
            this.movementDB.countDocuments(searchFilters)
        ]);

        const totalPages = Math.ceil(totalItems / limitNumber);

        return {
            data: movements?.map(movement => MovementModel.hydrate(movement)),
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalItems,
                itemsPerPage: limitNumber,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1,
            },
        };
    }
}
