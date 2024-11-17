import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { DocumentModel } from '../../../domain/models/document.model';
import { IDocumentRepository } from '../../../domain/repositories/document.interface.repository';
import { DocumentSchema } from '../schemas/document.schema';

@Injectable()
export class DocumentRepository implements IDocumentRepository {
  constructor(
    @InjectModel('Document')
    private readonly documentModel: Model<DocumentSchema>,
  ) {}

  async findValue(value: string): Promise<DocumentModel> {
    const find = await (
      await this.documentModel.findOne({ value: value })
    ).populate('catDocument');

    if (!find) {
      throw new BaseErrorException(
        `The document with value ${value} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }

    return DocumentModel.hydrate(find);
  }

  async create(document: DocumentModel): Promise<DocumentModel> {
    const schema = new this.documentModel(document.toJSON());

    const saved = await schema.save();

    if (!saved) {
      throw new BaseErrorException(
        'Error creating the document',
        HttpStatus.BAD_REQUEST,
      );
    }

    return DocumentModel.hydrate(saved);
  }
}
