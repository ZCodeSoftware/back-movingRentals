import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { VehicleOwnerModel } from "../../../domain/models/vehicleowner.model";
import { IVehicleOwnerRepository } from "../../../domain/repositories/vehicleowner.interface.repository";
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

    async findAll(): Promise<VehicleOwnerModel[]> {
        const vehicleowners = await this.vehicleownerDB.find();
        return vehicleowners?.map(vehicleowner => VehicleOwnerModel.hydrate(vehicleowner));
    }
}
