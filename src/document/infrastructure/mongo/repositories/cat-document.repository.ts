import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base/base.error.exception';
import { CatDocumentModel } from '../../../domain/models/cat-document.model';
import { ICatDocumentRepository } from '../../../domain/repositories/cat-document.interface.repository';
import { CatDocumentSchema } from '../schemas/cat-document.schema';

@Injectable()
export class CatDocumentRepository implements ICatDocumentRepository {
  constructor(
    @InjectModel('CatDocument')
    private readonly catDocumentModel: Model<CatDocumentSchema>,
  ) {}

  async findById(carDocumentId: string): Promise<CatDocumentModel> {
    const find = await this.catDocumentModel.findById(carDocumentId);

    if (!find) {
      throw new BaseErrorException(
        `The document with ID ${carDocumentId} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }

    return CatDocumentModel.hydrate(find);
  }
}
