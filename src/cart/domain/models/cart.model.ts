import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { DatesDTO } from '../../infrastructure/nest/dtos/cart.dto';
import { BranchesModel } from './branches.model';
import { TicketModel } from './ticket.model';
import { TourModel } from './tour.model';
import { TransferModel } from './transfer.model';
import { VehicleModel } from './vehicle.model';

interface Passenger {
  adult: number;
  child: number;
}

interface DeliveryInfo {
  requiresDelivery: boolean;
  deliveryType: 'one-way' | 'round-trip';
  oneWayType: 'pickup' | 'delivery' | null;
  deliveryAddress: string;
  deliveryCost: number;
  distance?: number;
  exceedsLimit?: boolean;
}

export class CartModel extends BaseModel {
  private _transfer: { transfer: TransferModel, date: Date, passengers: Passenger, quantity: number, total?: number }[];
  private _branch: BranchesModel;
  private _vehicles: { vehicle: VehicleModel, total: number, dates: DatesDTO, passengers: Passenger, delivery?: DeliveryInfo }[];
  private _tours: { tour: TourModel, date: Date, quantity: number, passengers: Passenger, total?: number }[];
  private _tickets: { ticket: TicketModel, date: Date, quantity: number, passengers: Passenger, total?: number }[];
  private _delivery?: boolean;
  private _deliveryAddress?: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      branch: this._branch ? this._branch.toJSON() : null,
      transfer: this._transfer ? this._transfer.map((t) => ({
        transfer: t.transfer.toJSON(),
        date: t.date,
        passengers: t.passengers,
        quantity: t.quantity,
        total: t.total
      })) : [],
      vehicles: this._vehicles ? this._vehicles.map((v) => ({ vehicle: v.vehicle.toJSON(), total: v.total, dates: v.dates, passengers: v.passengers, delivery: v.delivery })) : [],
      tours: this._tours ? this._tours.map((t) => ({ tour: t.tour.toJSON(), date: t.date, quantity: t.quantity, passengers: t.passengers, total: t.total })) : [],
      tickets: this._tickets ? this._tickets.map((t) => ({ ticket: t.ticket.toJSON(), date: t.date, quantity: t.quantity, passengers: t.passengers, total: t.total })) : [],
      delivery: this._delivery ?? false,
      deliveryAddress: this._deliveryAddress ?? null,
    };
  }

  static create(cart: any): CartModel {
    const newCart = new CartModel(new Identifier(cart._id));
    if (typeof cart.delivery === 'boolean') newCart._delivery = cart.delivery;
    if (typeof cart.deliveryAddress === 'string') newCart._deliveryAddress = cart.deliveryAddress;

    return newCart;
  }

  static hydrate(cart: any): CartModel {
    const newCart = new CartModel(new Identifier(cart._id));
    newCart._branch = cart.branch ? BranchesModel.hydrate(cart.branch) : null;
    newCart._transfer = cart.transfer ? cart.transfer.map((t) => ({ transfer: TransferModel.hydrate(t.transfer), date: t.date, passengers: t.passengers, quantity: t.quantity, total: t.total })) : [];
    newCart._vehicles = cart.vehicles ? cart.vehicles.map((v) => ({ vehicle: VehicleModel.hydrate(v.vehicle), total: v.total, dates: v.dates, passengers: v.passengers, delivery: v.delivery })) : [];
    newCart._tours = cart.tours ? cart.tours.map((t) => ({ tour: TourModel.hydrate(t.tour), date: t.date, quantity: t.quantity, passengers: t.passengers, total: t.total })) : [];
    newCart._tickets = cart.tickets ? cart.tickets.map((t) => ({ ticket: TicketModel.hydrate(t.ticket), date: t.date, passengers: t.passengers, quantity: t.quantity, total: t.total })) : [];
    newCart._delivery = typeof cart.delivery === 'boolean' ? cart.delivery : undefined;
    newCart._deliveryAddress = typeof cart.deliveryAddress === 'string' ? cart.deliveryAddress : undefined;
    return newCart;
  }

  // Domain behavior
  setDelivery(delivery: boolean, address?: string) {
    this._delivery = delivery;
    this._deliveryAddress = address;
  }

  setDeliveryAddress(address?: string) {
    this._deliveryAddress = address;
  }
}
