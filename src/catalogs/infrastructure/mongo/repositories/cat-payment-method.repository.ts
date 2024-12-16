import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { CatPaymentMethodModel } from '../../../domain/models/cat-payment-method.model';
import { ICatPaymentMethodRepository } from '../../../domain/repositories/cat-payment-method.interface.repository';
import { CatPaymentMethodSchema } from '../schemas/cat-paymet-method.schema';

@Injectable()
export class CatPaymentMethodRepository implements ICatPaymentMethodRepository {
  constructor(
    @InjectModel('CatPaymentMethod')
    private readonly catPaymentMethodModel: Model<CatPaymentMethodSchema>,
  ) {}

  async findAll(): Promise<CatPaymentMethodModel[]> {
    const catPaymentMethods = await this.catPaymentMethodModel.find();

    return catPaymentMethods.map((catPaymentMethods) =>
      CatPaymentMethodModel.hydrate(catPaymentMethods),
    );
  }

  async findById(catPaymentMethodId: string): Promise<CatPaymentMethodModel> {
    const catPaymentMethod =
      await this.catPaymentMethodModel.findById(catPaymentMethodId);

    if (!catPaymentMethod)
      throw new BaseErrorException(
        'CatPaymentMethod not found',
        HttpStatus.NOT_FOUND,
      );

    return CatPaymentMethodModel.hydrate(catPaymentMethod);
  }

  async create(
    paymentMethod: CatPaymentMethodModel,
  ): Promise<CatPaymentMethodModel> {
    const schema = new this.catPaymentMethodModel(paymentMethod.toJSON());

    const createdPaymentMethod = await schema.save();

    if (!createdPaymentMethod)
      throw new BaseErrorException(
        `payment method shouldn't be created`,
        HttpStatus.BAD_REQUEST,
      );

    return CatPaymentMethodModel.hydrate(createdPaymentMethod);
  }
}
