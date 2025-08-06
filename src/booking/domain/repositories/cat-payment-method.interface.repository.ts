import { CatPaymentMethodModel } from '../models/cat-payment-method.model';

export interface ICatPaymentMethodRepository {
  findById(catPaymentMethodId: string): Promise<CatPaymentMethodModel>;
  findAll(): Promise<CatPaymentMethodModel[]>;
}
