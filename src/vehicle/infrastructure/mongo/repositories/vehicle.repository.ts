import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
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
}
