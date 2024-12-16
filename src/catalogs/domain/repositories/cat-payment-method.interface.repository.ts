import { CatPaymentMethodModel } from '../models/cat-payment-method.model';

export interface ICatPaymentMethodRepository {
  findAll(): Promise<CatPaymentMethodModel[]>;
  findById(catPaymentMethodId: string): Promise<CatPaymentMethodModel>;
  create(
    catPaymentMethod: CatPaymentMethodModel,
  ): Promise<CatPaymentMethodModel>;
}
