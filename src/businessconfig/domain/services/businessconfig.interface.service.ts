import { BusinessConfigModel } from "../models/businessconfig.model";
import { ICreateBusinessConfig, IUpdateBusinessConfig } from "../types/businessconfig.type";

export interface IBusinessConfigService {
    create(businessconfig: ICreateBusinessConfig): Promise<BusinessConfigModel>;
    findById(id: string): Promise<BusinessConfigModel>;
    findAll(): Promise<BusinessConfigModel[]>;
    findByBranch(branchId: string): Promise<BusinessConfigModel>;
    update(id: string, businessconfig: IUpdateBusinessConfig): Promise<BusinessConfigModel>
}
