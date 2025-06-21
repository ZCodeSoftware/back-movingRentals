import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { IBranchesRepository } from "../../../branches/domain/repositories/branches.interface.repository";
import SymbolsBranches from "../../../branches/symbols-branches";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { BusinessConfigModel } from "../../domain/models/businessconfig.model";
import { IBusinessConfigRepository } from "../../domain/repositories/businessconfig.interface.repository";
import { IBusinessConfigService } from "../../domain/services/businessconfig.interface.service";
import { ICreateBusinessConfig, IUpdateBusinessConfig } from "../../domain/types/businessconfig.type";
import SymbolsBusinessConfig from "../../symbols-businessconfig";

@Injectable()
export class BusinessConfigService implements IBusinessConfigService {
    constructor(
        @Inject(SymbolsBusinessConfig.IBusinessConfigRepository)
        private readonly businessconfigRepository: IBusinessConfigRepository,
        @Inject(SymbolsBranches.IBranchesRepository)
        private readonly branchesRepository: IBranchesRepository
    ) { }

    async create(businessconfig: ICreateBusinessConfig): Promise<BusinessConfigModel> {
        // Validate that the branch exists
        await this.branchesRepository.findById(businessconfig.branchId);

        // Check if a business config already exists for this branch
        try {
            await this.businessconfigRepository.findByBranch(businessconfig.branchId);
            throw new BaseErrorException(
                'A business configuration already exists for this branch',
                HttpStatus.CONFLICT
            );
        } catch (error) {
            // If not found, that's what we want - continue with creation
            if (error.statusCode !== HttpStatus.NOT_FOUND) {
                throw error;
            }
        }

        const businessconfigModel = BusinessConfigModel.create(businessconfig);
        return this.businessconfigRepository.create(businessconfigModel);
    }

    async findById(id: string): Promise<BusinessConfigModel> {
        return this.businessconfigRepository.findById(id);
    }

    async findAll(): Promise<BusinessConfigModel[]> {
        return this.businessconfigRepository.findAll();
    }

    async findByBranch(branchId: string): Promise<BusinessConfigModel> {
        // Validate that the branch exists
        await this.branchesRepository.findById(branchId);

        return this.businessconfigRepository.findByBranch(branchId);
    }

    async update(id: string, businessconfig: IUpdateBusinessConfig): Promise<BusinessConfigModel> {
        await this.branchesRepository.findById(businessconfig.branchId);

        const businessconfigModel = BusinessConfigModel.create({ ...businessconfig });
        return this.businessconfigRepository.update(id, businessconfigModel);
    }
}
