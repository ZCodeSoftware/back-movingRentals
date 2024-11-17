import { Inject, Injectable } from '@nestjs/common';
import { BaseErrorException } from '../../../core/domain/exceptions/base/base.error.exception';
import { CatDocumentModel } from '../../domain/models/cat-document.model';
import { ICatDocumentRepository } from '../../domain/repositories/cat-document.interface.repository';
import { ICatDocumentService } from '../../domain/services/cat-document.interface.service';
import { ICatDocumentCreate } from '../../domain/types/cat-document.type';
import SymbolsCatalogs from '../../symbols-catalogs';

@Injectable()
export class CatDocumentService implements ICatDocumentService {
  constructor(
    @Inject(SymbolsCatalogs.ICatDocumentRepository)
    private readonly catDocumentRepository: ICatDocumentRepository,
  ) {}

  async findAll(): Promise<CatDocumentModel[]> {
    try {
      return await this.catDocumentRepository.findAll();
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findById(carDocumentId: string): Promise<CatDocumentModel> {
    try {
      return await this.catDocumentRepository.findById(carDocumentId);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findByName(carDocumentName: string): Promise<CatDocumentModel> {
    try {
      return await this.catDocumentRepository.findByName(carDocumentName);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async create(carDocument: ICatDocumentCreate): Promise<CatDocumentModel> {
    try {
      const documentModel = CatDocumentModel.create(carDocument);

      return await this.catDocumentRepository.create(documentModel);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
