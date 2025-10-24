import { BookingModel } from '../../../booking/domain/models/booking.model';
import { CatStatusModel } from '../../../booking/domain/models/cat-status.model';
import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { UserModel } from '../../../user/domain/models/user.model';
import { VehicleOwnerModel } from '../../../vehicleowner/domain/models/vehicleowner.model';

export interface ContractExtension {
  newEndDateTime?: Date;
  paymentMethod?: any;
  extensionAmount?: number;
  commissionPercentage?: number;
  extensionStatus?: any;
}

export interface ContractSnapshot {
  timestamp: Date;
  modifiedBy: any;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  reason?: string;
  historyEntry: any; // ObjectId del ContractHistory asociado
}

export class ContractModel extends BaseModel {
  private _booking: BookingModel;
  private _reservingUser: UserModel;
  private _createdByUser: UserModel;
  private _extension?: ContractExtension;
  private _status: CatStatusModel;
  private _concierge?: VehicleOwnerModel;
  private _source: string;
  private _timeline?: any[];
  private _snapshots?: ContractSnapshot[];

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      booking: this._booking ? this._booking.toJSON() : null,
      reservingUser: this._reservingUser ? this._reservingUser.toJSON() : null,
      createdByUser: this._createdByUser ? this._createdByUser.toJSON() : null,
      extension: this._extension,
      status: this._status ? this._status.toJSON() : null,
      concierge: this._concierge ? this._concierge.toJSON() : null,
      source: this._source,
      timeline: this._timeline,
      snapshots: this._snapshots,
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

  get concierge(): VehicleOwnerModel {
    return this._concierge;
  }

  get source(): string {
    return this._source;
  }

  get timeline(): any[] {
    return this._timeline;
  }

  get snapshots(): ContractSnapshot[] {
    return this._snapshots;
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
    newContract._concierge = contract.concierge;
    newContract._source = contract.source || 'Web';

    return newContract;
  }

  static hydrate(contract: any): ContractModel {
    const newContract = new ContractModel(new Identifier(contract._id));

    newContract._booking = contract.booking ? BookingModel.hydrate(contract.booking) : null;
    newContract._reservingUser = contract.reservingUser ? UserModel.hydrate(contract.reservingUser) : null;
    newContract._createdByUser = contract.createdByUser ? UserModel.hydrate(contract.createdByUser) : null;
    newContract._extension = contract.extension;
    newContract._status = contract.status ? CatStatusModel.hydrate(contract.status) : null;
    newContract._concierge = contract.concierge ? VehicleOwnerModel.hydrate(contract.concierge) : null;
    newContract._source = contract.source || 'Web';
    newContract._timeline = contract.timeline || [];
    newContract._snapshots = contract.snapshots || [];
    newContract._createdAt = contract.createdAt;
    newContract._updatedAt = contract.updatedAt;

    return newContract;
  }
}
