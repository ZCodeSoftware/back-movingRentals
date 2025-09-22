import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { UserModel } from '../../../user/domain/models/user.model';
import { VehicleModel } from '../../../vehicle/domain/models/vehicle.model';
import { VehicleOwnerModel } from '../../../vehicleowner/domain/models/vehicleowner.model';

export class CommissionModel extends BaseModel {
  private _booking: string;
  private _bookingNumber: number;
  private _user: UserModel | string;
  private _vehicleOwner: VehicleOwnerModel | string;
  private _vehicle: VehicleModel | string;
  private _detail: string;
  private _status: 'PENDING' | 'PAID' | 'CANCELLED';
  private _amount: number;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      booking: this._booking,
      bookingNumber: this._bookingNumber,
      user: this._user instanceof UserModel ? this._user.toJSON() : this._user,
      vehicleOwner: this._vehicleOwner instanceof VehicleOwnerModel ? this._vehicleOwner.toJSON() : this._vehicleOwner,
      vehicle: this._vehicle instanceof VehicleModel ? this._vehicle.toJSON() : this._vehicle,
      detail: this._detail,
      status: this._status,
      amount: this._amount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static create(data: any): CommissionModel {
    const m = new CommissionModel(new Identifier(data._id));
    m._booking = data.booking;
    m._bookingNumber = data.bookingNumber;
    m._user = data.user;
    m._vehicleOwner = data.vehicleOwner;
    m._vehicle = data.vehicle;
    m._detail = data.detail ?? 'Renta';
    m._status = data.status ?? 'PENDING';
    m._amount = data.amount;
    return m;
  }

  static hydrate(data: any): CommissionModel {
    const m = new CommissionModel(new Identifier(data._id));
    m._booking = data.booking?.toString?.() ?? data.booking;
    m._bookingNumber = data.bookingNumber;
    m._user = data.user ? UserModel.hydrate(data.user) : data.user;
    m._vehicleOwner = data.vehicleOwner ? VehicleOwnerModel.hydrate(data.vehicleOwner) : data.vehicleOwner;
    m._vehicle = data.vehicle ? VehicleModel.hydrate(data.vehicle) : data.vehicle;
    m._detail = data.detail;
    m._status = data.status;
    m._amount = data.amount;
    m._createdAt = data.createdAt;
    m._updatedAt = data.updatedAt;
    return m;
  }
}
