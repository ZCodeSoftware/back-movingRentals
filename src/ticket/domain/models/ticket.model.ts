import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

export class TicketModel extends BaseModel {
  private _name: string;
  private _description: string;
  private _location: string;
  private _totalPrice: number;
  private _movingPrice: number;
  private _cenotePrice: number;
  private _category: CatCategoryModel;
  private _isActive: boolean = true;

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      description: this._description,
      location: this._location,
      totalPrice: this._totalPrice,
      movingPrice: this._movingPrice,
      cenotePrice: this._cenotePrice,
      isActive: this._isActive,
      category: this._category ? this._category.toJSON() : null,
    };
  }

  static create(ticket: any): TicketModel {
    const newTicket = new TicketModel(new Identifier(ticket._id));
    newTicket._name = ticket.name;
    newTicket._description = ticket.description;
    newTicket._location = ticket.location;
    newTicket._totalPrice = ticket.totalPrice;
    newTicket._movingPrice = ticket.movingPrice;
    newTicket._cenotePrice = ticket.cenotePrice;
    newTicket._isActive = ticket.isActive;

    return newTicket;
  }

  static hydrate(ticket: any): TicketModel {
    const newTicket = new TicketModel(new Identifier(ticket._id));
    newTicket._name = ticket.name;
    newTicket._description = ticket.description;
    newTicket._location = ticket.location;
    newTicket._totalPrice = ticket.totalPrice;
    newTicket._movingPrice = ticket.movingPrice;
    newTicket._cenotePrice = ticket.cenotePrice;
    newTicket._isActive = ticket.isActive;
    newTicket._category = ticket.category ? CatCategoryModel.hydrate(ticket.category) : null;

    return newTicket;
  }
}
