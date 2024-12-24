import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { VEHICLE_RELATIONS } from "../../../../core/infrastructure/nest/constants/relations.constant";
import { VehicleModel } from "../../../domain/models/vehicle.model";
import { IVehicleRepository } from "../../../domain/repositories/vehicle.interface.repository";
import { VehicleSchema } from "../schemas/vehicle.schema";

@Injectable()
export class VehicleRepository implements IVehicleRepository {
    constructor(
        @InjectModel('Vehicle') private readonly vehicleDB: Model<VehicleSchema>
    ) { }

    async create(vehicle: VehicleModel): Promise<VehicleModel> {
        const schema = new this.vehicleDB(vehicle.toJSON());
        const newVehicle = await schema.save();

        if (!newVehicle) throw new BaseErrorException(`Vehicle shouldn't be created`, HttpStatus.BAD_REQUEST);

        return VehicleModel.hydrate(newVehicle);
    }

    async findById(id: string): Promise<VehicleModel> {
        const vehicle = await this.vehicleDB.findById(id).populate('category').populate('owner');
        if (!vehicle) throw new BaseErrorException('Vehicle not found', HttpStatus.NOT_FOUND);
        return VehicleModel.hydrate(vehicle);
    }

    async findAll(): Promise<VehicleModel[]> {
        const vehicles = await this.vehicleDB.find().populate('category').populate('owner');
        return vehicles?.map(vehicle => VehicleModel.hydrate(vehicle));
    }

    async update(id: string, vehicle: VehicleModel): Promise<VehicleModel> {
        const updateObject = vehicle.toJSON();

        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => {
                if (VEHICLE_RELATIONS.includes(key)) {
                    return value !== null && value !== undefined && typeof value === 'object' && '_id' in value;
                }
                return value !== null && value !== undefined;
            })
        );

        const updatedVehicle = await this.vehicleDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true, omitUndefined: true }).populate('category').populate('owner');

        if (!updatedVehicle) throw new BaseErrorException('Vehicle not found', HttpStatus.NOT_FOUND);

        return VehicleModel.hydrate(updatedVehicle);
    }
}
