import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class VehicleOwnerModel extends BaseModel {
  private _name: string;
  private _commissionPercentage: number;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      commissionPercentage: this._commissionPercentage
    };
  }

  static create(vehicleowner: any): VehicleOwnerModel {
    const newVehicleOwner = new VehicleOwnerModel(new Identifier(vehicleowner._id));
    newVehicleOwner._name = vehicleowner.name;
    newVehicleOwner._commissionPercentage = vehicleowner.commissionPercentage;

    return newVehicleOwner;
  }

  static hydrate(vehicleowner: any): VehicleOwnerModel {
    const newVehicleOwner = new VehicleOwnerModel(new Identifier(vehicleowner._id));
    newVehicleOwner._name = vehicleowner.name;
    newVehicleOwner._commissionPercentage = vehicleowner.commissionPercentage;

    return newVehicleOwner;
  }
}
