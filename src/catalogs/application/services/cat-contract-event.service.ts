import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import SymbolsCatalogs from '../../symbols-catalogs';
import { ICatContractEventService } from '../../domain/services/cat-contract-event.interface.service';
import { ICatContractEventRepository } from '../../domain/repositories/cat-contract-event.interface.repository';
import { CatContractEventModel } from '../../domain/models/cat-contract-event.model';
import { ICreateContractEvent } from '../../domain/types/cat-contract-event.type';

@Injectable()
export class CatContractEventService implements ICatContractEventService {
  constructor(
    @Inject(SymbolsCatalogs.ICatContractEventRepository)
    private readonly repo: ICatContractEventRepository,
  ) {}

  async create(payload: ICreateContractEvent): Promise<CatContractEventModel> {
    try {
      const exists = await this.repo.findByName(payload.name);
      if (exists) {
        throw new BaseErrorException(`CatContractEvent with name ${payload.name} already exists`, HttpStatus.BAD_REQUEST);
      }
      const model = CatContractEventModel.create({ name: payload.name });
      return await this.repo.create(model);
    } catch (error: any) {
      throw new BaseErrorException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(): Promise<CatContractEventModel[]> {
    try {
      return await this.repo.findAll();
    } catch (error: any) {
      throw new BaseErrorException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findById(id: string): Promise<CatContractEventModel> {
    try {
      const found = await this.repo.findById(id);
      if (!found) throw new BaseErrorException(`CatContractEvent with id ${id} not found`, HttpStatus.NOT_FOUND);
      return found;
    } catch (error: any) {
      throw new BaseErrorException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
