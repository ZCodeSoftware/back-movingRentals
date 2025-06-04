import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

export class VehicleModel extends BaseModel {
  private _name: string;
  private _tag?: string;
  private _specs?: string;
  private _description?: string;
  private _images: string;
  private _price?: number;
  private _category: CatCategoryModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      tag: this._tag,
      specs: this._specs,
      description: this._description,
      images: this._images,
      price: this._price,
      category: this._category ? this._category.toJSON() : {},
    };
  }

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  static create(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._tag = vehicle.tag;
    newVehicle._specs = vehicle.specs;
    newVehicle._description = vehicle.description;
    newVehicle._images = vehicle.images;
    newVehicle._price = vehicle.price;

    return newVehicle;
  }

  static hydrate(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._tag = vehicle.tag;
    newVehicle._specs = vehicle.specs;
    newVehicle._description = vehicle.description;
    newVehicle._images = vehicle.images;
    newVehicle._price = vehicle.price;
    newVehicle._category = vehicle.category
      ? CatCategoryModel.hydrate(vehicle.category)
      : null;
    return newVehicle;
  }
}
