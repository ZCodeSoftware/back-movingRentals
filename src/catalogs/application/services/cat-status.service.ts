import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { CatStatusModel } from "../../domain/models/cat-status.model";
import { ICatStatusRepository } from "../../domain/repositories/cat-status.interface.repository";
import { ICatStatusService } from "../../domain/services/cat-status.interface.service";
import { ICreateStatus } from "../../domain/types/cat-status.type";
import SymbolsCatalogs from "../../symbols-catalogs";

@Injectable()
export class CatStatusService implements ICatStatusService {
    constructor(
        @Inject(SymbolsCatalogs.ICatStatusRepository) private readonly catStatusRepository: ICatStatusRepository
    ) { }

    async create(catStatus: ICreateStatus): Promise<CatStatusModel> {
        try {
            const exist = await this.catStatusRepository.findByName(catStatus.name);
            if (exist) {
                throw new BaseErrorException(`CatStatus with name ${catStatus.name} already exists`, HttpStatus.BAD_REQUEST);
            }

            const catStatusModel = CatStatusModel.create({ name: catStatus.name });
            return await this.catStatusRepository.create(catStatusModel);
        } catch (error) {
            throw new BaseErrorException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async findAll(): Promise<CatStatusModel[]> {
        try {
            return await this.catStatusRepository.findAll();
        } catch (error) {
            throw new BaseErrorException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async findById(catStatusId: string): Promise<CatStatusModel> {
        try {
            const catStatus = await this.catStatusRepository.findById(catStatusId
            );
            if (!catStatus) {
                throw new BaseErrorException(`CatStatus with id ${catStatusId} not found`, HttpStatus.NOT_FOUND);
            }
            return catStatus;
        } catch (error) {
            throw new BaseErrorException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}