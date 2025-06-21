import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { BusinessConfigModel } from "../../../domain/models/businessconfig.model";
import { IBusinessConfigRepository } from "../../../domain/repositories/businessconfig.interface.repository";
import { BusinessConfigSchema } from "../schemas/businessconfig.schema";

@Injectable()
export class BusinessConfigRepository implements IBusinessConfigRepository {
    constructor(
        @InjectModel('BusinessConfig') private readonly businessconfigDB: Model<BusinessConfigSchema>
    ) { }

    async create(businessconfig: BusinessConfigModel): Promise<BusinessConfigModel> {
        const schema = new this.businessconfigDB(businessconfig.toJSON());
        const newBusinessConfig = await schema.save();

        if (!newBusinessConfig) throw new BaseErrorException(`BusinessConfig shouldn't be created`, HttpStatus.BAD_REQUEST);

        // Populate the branch after creation
        const populatedBusinessConfig = await this.businessconfigDB.findById(newBusinessConfig._id).populate('branch');
        return BusinessConfigModel.hydrate(populatedBusinessConfig);
    }

    async findById(id: string): Promise<BusinessConfigModel> {
        const businessconfig = await this.businessconfigDB.findById(id).populate('branch');
        if (!businessconfig) throw new BaseErrorException('BusinessConfig not found', HttpStatus.NOT_FOUND);
        return BusinessConfigModel.hydrate(businessconfig);
    }

    async findAll(): Promise<BusinessConfigModel[]> {
        const businessconfigs = await this.businessconfigDB.find().populate('branch');
        return businessconfigs?.map(businessconfig => BusinessConfigModel.hydrate(businessconfig));
    }

    async findByBranch(branchId: string): Promise<BusinessConfigModel> {
        const businessconfig = await this.businessconfigDB.findOne({ branch: branchId }).populate('branch');
        if (!businessconfig) throw new BaseErrorException('BusinessConfig not found for this branch', HttpStatus.NOT_FOUND);
        return BusinessConfigModel.hydrate(businessconfig);
    }

    async update(id: string, businessconfig: BusinessConfigModel): Promise<BusinessConfigModel> {
        const updatedBusinessConfig = await this.businessconfigDB.findByIdAndUpdate(
            id,
            businessconfig.toJSON(),
            { new: true, omitUndefined: true }
        ).populate('branch');

        if (!updatedBusinessConfig) throw new BaseErrorException('BusinessConfig not found', HttpStatus.NOT_FOUND);

        return BusinessConfigModel.hydrate(updatedBusinessConfig);
    }
}
