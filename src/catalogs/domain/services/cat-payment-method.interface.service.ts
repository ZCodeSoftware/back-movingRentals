import { CatPaymentMethodModel } from '../models/cat-payment-method.model';
import { ICatPaymentMethodCreate } from '../types/cat-payment-method.type';

export interface ICatPaymentMethodService {
  findAll(): Promise<CatPaymentMethodModel[]>;
  findById(catPaymentMethodId: string): Promise<CatPaymentMethodModel>;
  create(paymetMethod: ICatPaymentMethodCreate): Promise<CatPaymentMethodModel>;
}
