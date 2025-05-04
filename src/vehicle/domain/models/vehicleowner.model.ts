import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class VehicleOwnerModel extends BaseModel {
  private _name: string;
  private _commissionPercentage: number;
  private _isActive: boolean = true;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      isActive: this._isActive,
      commissionPercentage: this._commissionPercentage
    };
  }

  static create(vehicleowner: any): VehicleOwnerModel {
    const newVehicleOwner = new VehicleOwnerModel(new Identifier(vehicleowner._id));
    newVehicleOwner._name = vehicleowner.name;
    newVehicleOwner._isActive = vehicleowner.isActive;
    newVehicleOwner._commissionPercentage = vehicleowner.commissionPercentage;

    return newVehicleOwner;
  }

  static hydrate(vehicleowner: any): VehicleOwnerModel {
    const newVehicleOwner = new VehicleOwnerModel(new Identifier(vehicleowner._id));
    newVehicleOwner._name = vehicleowner.name;
    newVehicleOwner._isActive = vehicleowner.isActive;
    newVehicleOwner._commissionPercentage = vehicleowner.commissionPercentage;

    return newVehicleOwner;
  }
}
