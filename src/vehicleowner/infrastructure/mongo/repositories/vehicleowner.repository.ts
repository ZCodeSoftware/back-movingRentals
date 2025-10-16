import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { VehicleOwnerModel } from "../../../domain/models/vehicleowner.model";
import { IVehicleOwnerRepository } from "../../../domain/repositories/vehicleowner.interface.repository";
import { IVehicleOwnerFilters } from "../../../domain/types/vehicleowner.type";
import { VehicleOwnerSchema } from "../schemas/vehicleowner.schema";

@Injectable()
export class VehicleOwnerRepository implements IVehicleOwnerRepository {
    constructor(
        @InjectModel('VehicleOwner') private readonly vehicleownerDB: Model<VehicleOwnerSchema>
    ) { }

    async create(vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel> {
        const schema = new this.vehicleownerDB(vehicleowner.toJSON());
        const newVehicleOwner = await schema.save();

        if (!newVehicleOwner) throw new BaseErrorException(`VehicleOwner shouldn't be created`, HttpStatus.BAD_REQUEST);

        return VehicleOwnerModel.hydrate(newVehicleOwner);
    }

    async findById(id: string): Promise<VehicleOwnerModel> {
        const vehicleowner = await this.vehicleownerDB.findById(id);
        if (!vehicleowner) throw new BaseErrorException('VehicleOwner not found', HttpStatus.NOT_FOUND);
        return VehicleOwnerModel.hydrate(vehicleowner);
    }

    async findByName(name: string): Promise<VehicleOwnerModel | null> {
        const vehicleowner = await this.vehicleownerDB.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        return vehicleowner ? VehicleOwnerModel.hydrate(vehicleowner) : null;
    }

    async findAll(filters?: IVehicleOwnerFilters): Promise<{ data: VehicleOwnerModel[], total: number }> {
        // Build match conditions
        const matchConditions: any = {};
        
        if (filters?.name) {
            matchConditions.name = { $regex: filters.name, $options: 'i' };
        }
        
        if (filters?.isConcierge !== undefined) {
            matchConditions.isConcierge = filters.isConcierge;
        }

        // Build aggregation pipeline
        const pipeline: mongoose.PipelineStage[] = [];

        // Add match stage if there are filters
        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
        }

        // Add lookup for vehicles
        pipeline.push({
            $lookup: {
                from: 'vehicle',
                localField: '_id',
                foreignField: 'owner',
                as: 'vehicles'
            }
        });

        // Add sort
        pipeline.push({ $sort: { name: 1 } });

        // Create pipeline for counting total documents
        const countPipeline = [...pipeline, { $count: "total" }];

        // Add pagination
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;

        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        // Execute both queries
        const [ownersWithVehicles, countResult] = await Promise.all([
            this.vehicleownerDB.aggregate(pipeline).exec(),
            this.vehicleownerDB.aggregate(countPipeline).exec()
        ]);

        const total = countResult.length > 0 ? countResult[0].total : 0;

        // Hydrate results
        const ownerModels = ownersWithVehicles.map(owner =>
            VehicleOwnerModel.hydrate(owner)
        );

        return {
            data: ownerModels,
            total
        };
    }

    async findAllConcierges(): Promise<VehicleOwnerModel[]> {
        const pipeline: mongoose.PipelineStage[] = [
            { $match: { isConcierge: true } },
            {
                $lookup: {
                    from: 'vehicle',
                    localField: '_id',
                    foreignField: 'owner',
                    as: 'vehicles'
                }
            },
            { $sort: { name: 1 } }
        ];

        const concierges = await this.vehicleownerDB.aggregate(pipeline).exec();
        return concierges.map(concierge => VehicleOwnerModel.hydrate(concierge));
    }

    async findAllOwners(): Promise<VehicleOwnerModel[]> {
        const pipeline: mongoose.PipelineStage[] = [
            { $match: { isConcierge: false } },
            {
                $lookup: {
                    from: 'vehicle',
                    localField: '_id',
                    foreignField: 'owner',
                    as: 'vehicles'
                }
            },
            { $sort: { name: 1 } }
        ];

        const owners = await this.vehicleownerDB.aggregate(pipeline).exec();
        return owners.map(owner => VehicleOwnerModel.hydrate(owner));
    }

    async update(id: string, vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel> {
        const updateObject = vehicleowner.toJSON();
        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => value !== null && value !== undefined)
        );
        const updated = await this.vehicleownerDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true });

        if (!updated) throw new BaseErrorException(`VehicleOwner shouldn't be updated`, HttpStatus.BAD_REQUEST);

        return VehicleOwnerModel.hydrate(updated);
    }

    async setConciergeCommission(percentage: number): Promise<{ matched: number; modified: number }> {
        const res = await this.vehicleownerDB.updateMany(
            { isConcierge: true },
            { $set: { commissionPercentage: percentage } }
        );
        return { matched: res.matchedCount ?? (res as any).n ?? 0, modified: res.modifiedCount ?? (res as any).nModified ?? 0 };
    }
}
