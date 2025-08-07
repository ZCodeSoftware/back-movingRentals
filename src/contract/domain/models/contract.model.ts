import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { BookingModel } from '../../../booking/domain/models/booking.model';
import { UserModel } from '../../../user/domain/models/user.model';
import { CatStatusModel } from '../../../booking/domain/models/cat-status.model';

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
  private _contractNumber: number;
  private _extension?: ContractExtension;
  private _status: CatStatusModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      booking: this._booking ? this._booking.toJSON() : null,
      reservingUser: this._reservingUser ? this._reservingUser.toJSON() : null,
      createdByUser: this._createdByUser ? this._createdByUser.toJSON() : null,
      contractNumber: this._contractNumber,
      extension: this._extension,
      status: this._status ? this._status.toJSON() : null,
    };
  }

  get contractNumber(): number {
    return this._contractNumber;
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
    newContract._contractNumber = contract.contractNumber;
    newContract._extension = contract.extension;
    newContract._status = contract.status;

    return newContract;
  }

  static hydrate(contract: any): ContractModel {
    const newContract = new ContractModel(new Identifier(contract._id));
    
    newContract._booking = contract.booking ? BookingModel.hydrate(contract.booking) : null;
    newContract._reservingUser = contract.reservingUser ? UserModel.hydrate(contract.reservingUser) : null;
    newContract._createdByUser = contract.createdByUser ? UserModel.hydrate(contract.createdByUser) : null;
    newContract._contractNumber = contract.contractNumber;
    newContract._extension = contract.extension;
    newContract._status = contract.status ? CatStatusModel.hydrate(contract.status) : null;

    return newContract;
  }
}
