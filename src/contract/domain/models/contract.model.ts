import { BookingModel } from '../../../booking/domain/models/booking.model';
import { CatStatusModel } from '../../../booking/domain/models/cat-status.model';
import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { UserModel } from '../../../user/domain/models/user.model';

export interface ContractExtension {
  newEndDateTime?: Date;
  paymentMethod?: any;
  extensionAmount?: number;
  commissionPercentage?: number;
  extensionStatus?: any;
}

export class ContractModel extends BaseModel {
  private _booking: BookingModel;
  private _reservingUser: UserModel;
  private _createdByUser: UserModel;
  private _extension?: ContractExtension;
  private _status: CatStatusModel;
  private _timeline?: any[];

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      booking: this._booking ? this._booking.toJSON() : null,
      reservingUser: this._reservingUser ? this._reservingUser.toJSON() : null,
      createdByUser: this._createdByUser ? this._createdByUser.toJSON() : null,
      extension: this._extension,
      status: this._status ? this._status.toJSON() : null,
      timeline: this._timeline,
    };
  }

  get booking(): BookingModel {
    return this._booking;
  }

  get reservingUser(): UserModel {
    return this._reservingUser;
  }

  get createdByUser(): UserModel {
    return this._createdByUser;
  }

  get extension(): ContractExtension {
    return this._extension;
  }

  get status(): CatStatusModel {
    return this._status;
  }

  get timeline(): any[] {
    return this._timeline;
  }

  addExtension(extension: ContractExtension): void {
    this._extension = extension;
  }

  updateStatus(status: CatStatusModel): void {
    this._status = status;
  }

  static create(contract: any): ContractModel {
    const newContract = new ContractModel(new Identifier(contract._id));

    newContract._booking = contract.booking;
    newContract._reservingUser = contract.reservingUser;
    newContract._createdByUser = contract.createdByUser;
    newContract._extension = contract.extension;
    newContract._status = contract.status;

    return newContract;
  }

  static hydrate(contract: any): ContractModel {
    const newContract = new ContractModel(new Identifier(contract._id));

    newContract._booking = contract.booking ? BookingModel.hydrate(contract.booking) : null;
    newContract._reservingUser = contract.reservingUser ? UserModel.hydrate(contract.reservingUser) : null;
    newContract._createdByUser = contract.createdByUser ? UserModel.hydrate(contract.createdByUser) : null;
    newContract._extension = contract.extension;
    newContract._status = contract.status ? CatStatusModel.hydrate(contract.status) : null;
    newContract._timeline = contract.timeline || [];
    newContract._createdAt = contract.createdAt;
    newContract._updatedAt = contract.updatedAt;

    return newContract;
  }
}
