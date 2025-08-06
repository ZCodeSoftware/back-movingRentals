import { TypeCatTypeMovement } from '../../../core/domain/enums/type-cat-type-movement';
import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { UserModel } from './user.model';

export class MovementModel extends BaseModel {
  private _type: TypeCatTypeMovement;
  private _detail: string;
  private _amount: number;
  private _date: Date;
  private _vehicle: string;
  private _createdBy: UserModel | string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      type: this._type,
      detail: this._detail,
      amount: this._amount,
      date: this._date,
      vehicle: this._vehicle,
      createdBy: this._createdBy instanceof UserModel ? this._createdBy.toJSON() : this._createdBy,
    };
  }

  static create(movement: any): MovementModel {
    const newMovement = new MovementModel(new Identifier(movement._id));
    newMovement._type = movement.type;
    newMovement._detail = movement.detail;
    newMovement._amount = movement.amount;
    newMovement._date = movement.date;
    newMovement._vehicle = movement.vehicle;
    newMovement._createdBy = movement.createdBy;

    return newMovement;
  }

  static hydrate(movement: any): MovementModel {
    const newMovement = new MovementModel(new Identifier(movement._id));
    newMovement._type = movement.type;
    newMovement._detail = movement.detail;
    newMovement._amount = movement.amount;
    newMovement._date = movement.date;
    newMovement._vehicle = movement.vehicle;
    newMovement._createdBy = movement.createdBy ? UserModel.hydrate(movement.createdBy) : null;

    return newMovement;
  }
}
