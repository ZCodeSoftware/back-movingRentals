import { TypeCatPaymentMethodAdmin } from '../../../core/domain/enums/type-cat-payment-method-admin';
import { TypeCatTypeMovement } from '../../../core/domain/enums/type-cat-type-movement';
import { TypeMovementDirection } from '../../../core/domain/enums/type-movement-direction';
import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { VehicleOwnerModel } from '../../../vehicleowner/domain/models/vehicleowner.model';
import { UserModel } from './user.model';

export class MovementModel extends BaseModel {
  private _type: TypeCatTypeMovement;
  private _direction: TypeMovementDirection;
  private _detail: string;
  private _amount: number;
  private _date: Date;
  private _paymentMethod: TypeCatPaymentMethodAdmin;
  private _vehicle: string;
  private _rentalDays?: number;
  private _contract?: string;
  private _createdBy: UserModel | string;
  private _beneficiary?: UserModel | VehicleOwnerModel | string;
  private _beneficiaryModel?: 'User' | 'VehicleOwner';

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      type: this._type,
      direction: this._direction,
      detail: this._detail,
      amount: this._amount,
      date: this._date,
      paymentMethod: this._paymentMethod,
      vehicle: this._vehicle,
      rentalDays: this._rentalDays,
      contract: this._contract,
      createdBy: this._createdBy instanceof UserModel ? this._createdBy.toJSON() : this._createdBy,
      beneficiary: this._beneficiary instanceof UserModel || this._beneficiary instanceof VehicleOwnerModel
        ? this._beneficiary.toJSON()
        : this._beneficiary,
      beneficiaryModel: this._beneficiaryModel,
    };
  }

  static create(movement: any): MovementModel {
    const newMovement = new MovementModel(new Identifier(movement._id));
    newMovement._type = movement.type;
    newMovement._direction = movement.direction;
    newMovement._detail = movement.detail;
    newMovement._amount = movement.amount;
    newMovement._date = movement.date;
    newMovement._paymentMethod = movement.paymentMethod;
    newMovement._vehicle = movement.vehicle;
    newMovement._rentalDays = movement.rentalDays;
    newMovement._contract = movement.contract;
    newMovement._createdBy = movement.createdBy;

    return newMovement;
  }

  static hydrate(movement: any): MovementModel {
    const newMovement = new MovementModel(new Identifier(movement._id));
    newMovement._type = movement.type;
    newMovement._direction = movement.direction;
    newMovement._detail = movement.detail;
    newMovement._amount = movement.amount;
    newMovement._date = movement.date;
    newMovement._paymentMethod = movement.paymentMethod;
    newMovement._vehicle = movement.vehicle;
    newMovement._rentalDays = movement.rentalDays;
    newMovement._contract = movement.contract;
    newMovement._createdBy = movement.createdBy ? UserModel.hydrate(movement.createdBy) : null;
    newMovement._beneficiaryModel = movement.beneficiaryModel;
    if (movement.beneficiary) {
      if (movement.beneficiaryModel === 'User') {
        newMovement._beneficiary = UserModel.hydrate(movement.beneficiary);
      } else if (movement.beneficiaryModel === 'VehicleOwner') {
        newMovement._beneficiary = VehicleOwnerModel.hydrate(movement.beneficiary);
      } else {
        newMovement._beneficiary = movement.beneficiary;
      }
    } else {
      newMovement._beneficiary = null;
    }

    return newMovement;
  }
}
