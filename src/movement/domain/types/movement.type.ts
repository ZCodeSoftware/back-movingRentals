import { TypeCatPaymentMethodAdmin } from "../../../core/domain/enums/type-cat-payment-method-admin";
import { TypeMovementDirection } from "../../../core/domain/enums/type-movement-direction";

export interface ICreateMovement {
    type: string;
    direction: TypeMovementDirection;
    detail: string;
    amount: number;
    date: Date;
    paymentMethod: TypeCatPaymentMethodAdmin;
    vehicle?: string;
    beneficiary?: string;
};
