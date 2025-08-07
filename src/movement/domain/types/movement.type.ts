import { TypeCatPaymentMethodAdmin } from "../../../core/domain/enums/type-cat-payment-method-admin";

export interface ICreateMovement {
    type: string;
    detail: string;
    amount: number;
    date: Date;
    paymentMethod: TypeCatPaymentMethodAdmin;
    vehicle?: string;
};
