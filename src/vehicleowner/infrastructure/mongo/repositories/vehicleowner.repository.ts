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
        const vehicleOwnerData = vehicleowner.toJSON();
        
        // Validar que el nombre sea único (solo entre los no eliminados)
        const existingOwner = await this.vehicleownerDB.findOne({ 
            name: { $regex: new RegExp(`^${vehicleOwnerData.name}$`, 'i') },
            deletedAt: null
        });
        
        if (existingOwner) {
            throw new BaseErrorException(`A vehicle owner with the name "${vehicleOwnerData.name}" already exists`, HttpStatus.CONFLICT);
        }

        const schema = new this.vehicleownerDB(vehicleOwnerData);
        const newVehicleOwner = await schema.save();

        if (!newVehicleOwner) throw new BaseErrorException(`VehicleOwner shouldn't be created`, HttpStatus.BAD_REQUEST);

        return VehicleOwnerModel.hydrate(newVehicleOwner);
    }

    async findById(id: string): Promise<VehicleOwnerModel> {
        const vehicleowner = await this.vehicleownerDB.findOne({ _id: id, deletedAt: null });
        if (!vehicleowner) throw new BaseErrorException('VehicleOwner not found', HttpStatus.NOT_FOUND);
        return VehicleOwnerModel.hydrate(vehicleowner);
    }

    async findByName(name: string): Promise<VehicleOwnerModel | null> {
        const vehicleowner = await this.vehicleownerDB.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            deletedAt: null
        });
        return vehicleowner ? VehicleOwnerModel.hydrate(vehicleowner) : null;
    }

    async findAll(filters?: IVehicleOwnerFilters): Promise<{ data: VehicleOwnerModel[], total: number }> {
        // Build match conditions
        const matchConditions: any = { deletedAt: null };
        
        if (filters?.name) {
            matchConditions.name = { $regex: filters.name, $options: 'i' };
        }
        
        if (filters?.isConcierge !== undefined) {
            matchConditions.isConcierge = filters.isConcierge;
        }

        // Build aggregation pipeline
        const pipeline: mongoose.PipelineStage[] = [];

        // Add match stage
        pipeline.push({ $match: matchConditions });

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
            { $match: { isConcierge: true, deletedAt: null } },
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
            { $match: { isConcierge: false, deletedAt: null } },
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

    async findAllOwnersSimple(): Promise<Array<{ _id: string; name: string }>> {
        const owners = await this.vehicleownerDB
            .find({ isConcierge: false, deletedAt: null })
            .select('_id name')
            .sort({ name: 1 })
            .lean()
            .exec();
        
        return owners.map(owner => ({
            _id: owner._id.toString(),
            name: owner.name
        }));
    }

    async update(id: string, vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel> {
        const updateObject = vehicleowner.toJSON();
        
        // Si se está actualizando el nombre, validar que sea único
        if (updateObject.name) {
            const existingOwner = await this.vehicleownerDB.findOne({ 
                name: { $regex: new RegExp(`^${updateObject.name}$`, 'i') },
                deletedAt: null,
                _id: { $ne: id }
            });
            
            if (existingOwner) {
                throw new BaseErrorException(`A vehicle owner with the name "${updateObject.name}" already exists`, HttpStatus.CONFLICT);
            }
        }

        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => value !== null && value !== undefined)
        );
        const updated = await this.vehicleownerDB.findOneAndUpdate(
            { _id: id, deletedAt: null },
            filteredUpdateObject,
            { new: true }
        );

        if (!updated) throw new BaseErrorException(`VehicleOwner shouldn't be updated`, HttpStatus.BAD_REQUEST);

        return VehicleOwnerModel.hydrate(updated);
    }

    async softDelete(id: string): Promise<VehicleOwnerModel> {
        const vehicleowner = await this.vehicleownerDB.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!vehicleowner) {
            throw new BaseErrorException('VehicleOwner not found or already deleted', HttpStatus.NOT_FOUND);
        }

        return VehicleOwnerModel.hydrate(vehicleowner);
    }

    async setConciergeCommission(percentage: number): Promise<{ matched: number; modified: number }> {
        const res = await this.vehicleownerDB.updateMany(
            { isConcierge: true, deletedAt: null },
            { $set: { commissionPercentage: percentage } }
        );
        return { matched: res.matchedCount ?? (res as any).n ?? 0, modified: res.modifiedCount ?? (res as any).nModified ?? 0 };
    }
}
