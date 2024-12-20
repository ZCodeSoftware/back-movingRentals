import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { DatesDTO } from '../../infrastructure/nest/dtos/cart.dto';
import { BranchesModel } from './branches.model';
import { TourModel } from './tour.model';
import { TransferModel } from './transfer.model';
import { VehicleModel } from './vehicle.model';

export class CartModel extends BaseModel {
  private _transfer: { transfer: TransferModel, date: Date }[];
  private _branch: BranchesModel;
  private _vehicles: { vehicle: VehicleModel, total: number, dates: DatesDTO }[];
  private _tours: { tour: TourModel, date: Date }[];
  private _travelers: { adults: number; childrens: number };

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      branch: this._branch ? this._branch.toJSON() : null,
      transfer: this._transfer ? this._transfer.map((t) => ({
        transfer: t.transfer.toJSON(),
        date: t.date
      })) : [],
      vehicles: this._vehicles ? this._vehicles.map((v) => ({ vehicle: v.vehicle.toJSON(), total: v.total, dates: v.dates })) : [],
      tours: this._tours ? this._tours.map((t) => ({ tour: t.tour.toJSON(), date: t.date })) : [],
      travelers: this._travelers,
    };
  }

  static create(cart: any): CartModel {
    const newCart = new CartModel(new Identifier(cart._id));
    newCart._travelers = cart.travelers;

    return newCart;
  }

  static hydrate(cart: any): CartModel {
    const newCart = new CartModel(new Identifier(cart._id));
    newCart._branch = cart.branch ? BranchesModel.hydrate(cart.branch) : null;
    newCart._transfer = cart.transfer ? cart.transfer.map((t) => ({ transfer: TransferModel.hydrate(t.transfer), date: t.date })) : [];
    newCart._vehicles = cart.vehicles ? cart.vehicles.map((v) => ({ vehicle: VehicleModel.hydrate(v.vehicle), total: v.total, dates: v.dates })) : [];
    newCart._tours = cart.tours ? cart.tours.map((t) => ({ tour: TourModel.hydrate(t.tour), date: t.date })) : [];
    newCart._travelers = cart.travelers;
    return newCart;
  }
}
