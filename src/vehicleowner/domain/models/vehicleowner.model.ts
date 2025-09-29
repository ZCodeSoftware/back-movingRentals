import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class VehicleOwnerModel extends BaseModel {
  private _name: string;
  private _commissionPercentage: number;
  private _phone: string;
  private _isConcierge: boolean;
  private _vehicles?: any[];

  get vehicles(): any[] {
    return this._vehicles;
  }

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      commissionPercentage: this._commissionPercentage,
      phone: this._phone,
      isConcierge: this._isConcierge,
      vehicles: this._vehicles
    };
  }

  static create(vehicleowner: any): VehicleOwnerModel {
    const newVehicleOwner = new VehicleOwnerModel(new Identifier(vehicleowner._id));
    newVehicleOwner._name = vehicleowner.name;
    newVehicleOwner._commissionPercentage = vehicleowner.commissionPercentage;
    newVehicleOwner._phone = vehicleowner.phone;
    newVehicleOwner._isConcierge = vehicleowner.isConcierge || false;

    return newVehicleOwner;
  }

  static hydrate(vehicleowner: any): VehicleOwnerModel {
    const newVehicleOwner = new VehicleOwnerModel(new Identifier(vehicleowner._id));
    newVehicleOwner._name = vehicleowner.name;
    newVehicleOwner._commissionPercentage = vehicleowner.commissionPercentage;
    newVehicleOwner._phone = vehicleowner.phone;
    newVehicleOwner._isConcierge = vehicleowner.isConcierge || false;
    newVehicleOwner._vehicles = vehicleowner.vehicles || [];

    return newVehicleOwner;
  }
}
