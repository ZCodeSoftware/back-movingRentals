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

  async findAll(): Promise<CatDocumentModel[]> {
    const document = await this.catDocumentModel.find();

    return document.map((document) => CatDocumentModel.hydrate(document));
  }

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

  async findByName(carDocumentName: string): Promise<CatDocumentModel> {
    const find = await this.catDocumentModel.findOne({ name: carDocumentName });

    if (!find) {
      throw new BaseErrorException(
        `The document with name ${carDocumentName} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }

    return CatDocumentModel.hydrate(find);
  }

  async create(carDocument: CatDocumentModel): Promise<CatDocumentModel> {
    const schema = new this.catDocumentModel(carDocument.toJSON());

    const saved = await schema.save();

    if (!saved) {
      throw new BaseErrorException(
        'Error creating the document',
        HttpStatus.BAD_REQUEST,
      );
    }

    return CatDocumentModel.hydrate(saved);
  }
}
