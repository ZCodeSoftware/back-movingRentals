import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';
import { VehicleOwnerModel } from './vehicleowner.model';

export class VehicleModel extends BaseModel {
  private _name: string;
  private _specs?: string;
  private _description?: string;
  private _image: string;
  private _category: CatCategoryModel;
  private _owner: VehicleOwnerModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      specs: this._specs,
      description: this._description,
      image: this._image,
      category: this._category ? this._category.toJSON() : {},
      owner: this._owner ? this._owner.toJSON() : {},
    };
  }

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  addOwner(owner: VehicleOwnerModel) {
    this._owner = owner;
  }

  static create(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._specs = vehicle.specs;
    newVehicle._description = vehicle.description;
    newVehicle._image = vehicle.image

    return newVehicle;
  }

  static hydrate(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._specs = vehicle.specs;
    newVehicle._description = vehicle.description;
    newVehicle._image = vehicle.image;
    newVehicle._category = vehicle.category ? CatCategoryModel.hydrate(vehicle.category) : null;
    newVehicle._owner = vehicle.owner ? VehicleOwnerModel.hydrate(vehicle.owner) : null;
    return newVehicle;
  }
}
