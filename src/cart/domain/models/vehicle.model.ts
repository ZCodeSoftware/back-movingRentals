import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

export class VehicleModel extends BaseModel {
  private _name: string;
  private _description?: string;
  private _images: string[];
  private _model?: string;
  private _price?: number;
  private _pricePer4?: number;
  private _pricePer8?: number;
  private _pricePer24?: number;
  private _capacity: number;
  private _minRentalHours: number;
  private _category: CatCategoryModel;
  private _tag: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      description: this._description,
      images: this._images,
      model: this._model,
      price: this._price,
      pricePer4: this._pricePer4,
      pricePer8: this._pricePer8,
      pricePer24: this._pricePer24,
      capacity: this._capacity,
      minRentalHours: this._minRentalHours,
      tag: this._tag,
      category: this._category ? this._category.toJSON() : {},
    };
  }

  static create(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._description = vehicle.description;
    newVehicle._images = vehicle.images
    newVehicle._model = vehicle.model;
    newVehicle._price = vehicle.price;
    newVehicle._pricePer4 = vehicle.pricePer4;
    newVehicle._pricePer8 = vehicle.pricePer8;
    newVehicle._pricePer24 = vehicle.pricePer24;
    newVehicle._capacity = vehicle.capacity;
    newVehicle._minRentalHours = vehicle.minRentalHours;
    newVehicle._tag = vehicle.tag;

    return newVehicle;
  }

  static hydrate(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._description = vehicle.description;
    newVehicle._images = vehicle.images;
    newVehicle._model = vehicle.model;
    newVehicle._price = vehicle.price;
    newVehicle._pricePer4 = vehicle.pricePer4;
    newVehicle._pricePer8 = vehicle.pricePer8;
    newVehicle._pricePer24 = vehicle.pricePer24;
    newVehicle._capacity = vehicle.capacity;
    newVehicle._minRentalHours = vehicle.minRentalHours;
    newVehicle._tag = vehicle.tag;
    newVehicle._category = vehicle.category ? CatCategoryModel.hydrate(vehicle.category) : null;

    return newVehicle;
  }
}
