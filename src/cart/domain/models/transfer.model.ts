import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

export class TransferModel extends BaseModel {
  private _name: string;
  private _description?: string;
  private _capacity: number;
  private _estimatedDuration: string;
  private _price: number;
  private _category: CatCategoryModel;

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      description: this._description,
      capacity: this._capacity,
      estimatedDuration: this._estimatedDuration,
      price: this._price,
      category: this._category ? this._category.toJSON() : null,
    };
  }

  static create(transfer: any): TransferModel {
    const newTransfer = new TransferModel(new Identifier(transfer._id));
    newTransfer._name = transfer.name;
    newTransfer._description = transfer.description;
    newTransfer._capacity = transfer.capacity;
    newTransfer._estimatedDuration = transfer.estimatedDuration;
    newTransfer._price = transfer.price;

    return newTransfer;
  }

  static hydrate(transfer: any): TransferModel {
    const newTransfer = new TransferModel(new Identifier(transfer._id));
    newTransfer._name = transfer.name;
    newTransfer._description = transfer.description;
    newTransfer._capacity = transfer.capacity;
    newTransfer._estimatedDuration = transfer.estimatedDuration;
    newTransfer._price = transfer.price;
    newTransfer._category = transfer.category ? CatCategoryModel.create(transfer.category) : null;
    return newTransfer;
  }
}
