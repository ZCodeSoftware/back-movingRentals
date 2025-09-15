import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { VehicleOwner } from "../../../../core/infrastructure/mongo/schemas/public/vehicle-owner.schema";
import { UserSchema } from "../../../../user/infrastructure/mongo/schemas/user.schema";
import { MovementModel } from "../../../domain/models/movement.model";
import { UserModel } from "../../../domain/models/user.model";
import { IMovementRepository } from "../../../domain/repositories/movement.interface.repository";
import { CreateMovementDTO } from "../../nest/dtos/movement.dto";
import { MovementSchema } from "../schemas/movement.schema";

@Injectable()
export class MovementRepository implements IMovementRepository {
    constructor(
        @InjectModel('Movement') private readonly movementDB: Model<MovementSchema>,
        @InjectModel('User') private readonly userDB: Model<UserSchema>,
        @InjectModel(VehicleOwner.name) private readonly vehicleOwnerDB: Model<VehicleOwner>,
    ) { }

    async create(movement: CreateMovementDTO): Promise<MovementModel> {
        let beneficiaryModel: 'User' | 'VehicleOwner' | undefined;
        if (movement.beneficiary) {
            const user = await this.userDB.findById(movement.beneficiary);
            if (!user) {
                const vehicleOwner = await this.vehicleOwnerDB.findById(movement.beneficiary);
                if (!vehicleOwner) {
                    throw new BaseErrorException('Beneficiary not found', HttpStatus.NOT_FOUND)
                } else {
                    beneficiaryModel = 'VehicleOwner';
                }
            } else {
                beneficiaryModel = 'User';
            }
        }

        const movementToSave = { ...movement, beneficiaryModel };
        const schema = new this.movementDB(movementToSave);
        const newMovement = await schema.save();

        if (!newMovement) throw new BaseErrorException(`Movement shouldn't be created`, HttpStatus.BAD_REQUEST);

        // Populate the created movement with user and role data
        const populatedMovement = await this.movementDB.findById(newMovement._id).populate({
            path: 'createdBy',
            populate: {
                path: 'role'
            }
        })
            .populate('beneficiary');

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

    async findAll(filters: any, userId: string): Promise<{
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
        const { page = 1, limit = 10, startDate, endDate, vehicleId } = filters;

        const user = await this.userDB.findById(userId).populate('role');

        if (!user) throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);

        const userModel = UserModel.hydrate(user);

        const pageNumber = parseInt(page as string, 10) || 1;
        const limitNumber = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        const query: any = {};

        if (userModel.toJSON().role.name === TypeRoles.SELLER || userModel.toJSON().role.name === TypeRoles.SUPERVISOR) {
            query.createdBy = userModel.toJSON()._id;
        }

        if (vehicleId) {
            query.vehicle = vehicleId;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setUTCHours(23, 59, 59, 999);
                query.date.$lte = endOfDay;
            }
        }

        const otherFilters = { ...filters };
        delete otherFilters.page;
        delete otherFilters.limit;
        delete otherFilters.startDate;
        delete otherFilters.endDate;
        delete otherFilters.vehicleId;

        const finalQuery = { ...query, ...otherFilters };

        const [movements, totalItems] = await Promise.all([
            this.movementDB.find(finalQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNumber).populate({
                path: 'createdBy',
                populate: {
                    path: 'role'
                }
            })
                .populate('beneficiary'),
            this.movementDB.countDocuments(finalQuery)
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
