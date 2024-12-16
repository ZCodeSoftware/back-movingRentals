import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CatPaymentMethodModel } from '../../domain/models/cat-payment-method.model';
import { ICatPaymentMethodRepository } from '../../domain/repositories/cat-payment-method.interface.repository';
import { ICatPaymentMethodService } from '../../domain/services/cat-payment-method.interface.service';
import { ICatPaymentMethodCreate } from '../../domain/types/cat-payment-method.type';
import SymbolsCatalogs from '../../symbols-catalogs';

@Injectable()
export class CatPaymentMethodService implements ICatPaymentMethodService {
  constructor(
    @Inject(SymbolsCatalogs.ICatPaymentMethodRepository)
    private readonly catPaymentMethodRepository: ICatPaymentMethodRepository,
  ) {}

  async findAll(): Promise<CatPaymentMethodModel[]> {
    try {
      return await this.catPaymentMethodRepository.findAll();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findById(catPaymentMethodId: string): Promise<CatPaymentMethodModel> {
    try {
      return await this.catPaymentMethodRepository.findById(catPaymentMethodId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async create(
    paymetMethod: ICatPaymentMethodCreate,
  ): Promise<CatPaymentMethodModel> {
    try {
      const paymentMethodModel = CatPaymentMethodModel.create(paymetMethod);
      return await this.catPaymentMethodRepository.create(paymentMethodModel);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
