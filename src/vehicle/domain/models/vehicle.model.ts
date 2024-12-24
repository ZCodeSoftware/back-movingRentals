import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';
import { VehicleOwnerModel } from './vehicleowner.model';

export class VehicleModel extends BaseModel {
  private _name: string;
  private _tag: string;
  private _description?: string;
  private _images: string[];
  private _price?: number;
  private _pricePer4?: number;
  private _pricePer8?: number;
  private _pricePer24?: number;
  private _capacity: number;
  private _minRentalHours: number;
  private _category: CatCategoryModel;
  private _owner: VehicleOwnerModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      tag: this._tag,
      description: this._description,
      images: this._images,
      price: this._price,
      pricePer4: this._pricePer4,
      pricePer8: this._pricePer8,
      pricePer24: this._pricePer24,
      capacity: this._capacity,
      minRentalHours: this._minRentalHours,
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
    newVehicle._tag = vehicle.tag;
    newVehicle._description = vehicle.description;
    newVehicle._images = vehicle.images
    newVehicle._price = vehicle.price;
    newVehicle._pricePer4 = vehicle.pricePer4;
    newVehicle._pricePer8 = vehicle.pricePer8;
    newVehicle._pricePer24 = vehicle.pricePer24;
    newVehicle._capacity = vehicle.capacity;
    newVehicle._minRentalHours = vehicle.minRentalHours;

    return newVehicle;
  }

  static hydrate(vehicle: any): VehicleModel {
    const newVehicle = new VehicleModel(new Identifier(vehicle._id));
    newVehicle._name = vehicle.name;
    newVehicle._tag = vehicle.tag;
    newVehicle._description = vehicle.description;
    newVehicle._images = vehicle.images;
    newVehicle._price = vehicle.price;
    newVehicle._pricePer4 = vehicle.pricePer4;
    newVehicle._pricePer8 = vehicle.pricePer8;
    newVehicle._pricePer24 = vehicle.pricePer24;
    newVehicle._capacity = vehicle.capacity;
    newVehicle._minRentalHours = vehicle.minRentalHours;
    newVehicle._category = vehicle.category ? CatCategoryModel.hydrate(vehicle.category) : null;
    newVehicle._owner = vehicle.owner ? VehicleOwnerModel.hydrate(vehicle.owner) : null;

    return newVehicle;
  }
}
