import { BusinessConfigModel } from "../models/businessconfig.model";

export interface IBusinessConfigRepository {
    create(businessconfig: BusinessConfigModel): Promise<BusinessConfigModel>;
    findById(id: string): Promise<BusinessConfigModel>;
    findAll(): Promise<BusinessConfigModel[]>;
    findByBranch(branchId: string): Promise<BusinessConfigModel>;
    update(id: string, businessconfig: BusinessConfigModel): Promise<BusinessConfigModel>
}
