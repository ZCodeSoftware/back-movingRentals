import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { AddressModel } from './address.model';
import { TourModel } from './tour.model';
import { UserModel } from './user.model';
import { VehicleModel } from './vehicle.model';

export class BranchesModel extends BaseModel {
  private _name: string;
  private _address: AddressModel;
  private _vehicles?: VehicleModel[];
  private _tours?: TourModel[];
  private _users?: UserModel[];

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      address: this._address ? this._address : null,
      vehicles: this._vehicles
        ? this._vehicles.map((vehicle) => vehicle.toJSON())
        : null,
      tours: this._tours ? this._tours.map((tour) => tour.toJSON()) : null,
      users: this._users ? this._users.map((user) => user.toJSON()) : null,
    };
  }

  addAddress(address: AddressModel): void {
    this._address = address;
  }

  addVehicles(vehicle: VehicleModel): void {
    if (!this._vehicles) {
      this._vehicles = [];
    }
    this._vehicles.push(vehicle);
  }

  addTours(tour: TourModel): void {
    if (!this._tours) {
      this._tours = [];
    }
    this._tours.push(tour);
  }

  addUser(user: UserModel): void {
    if (!this._users) {
      this._users = [];
    }
    this._users.push(user);
  }

  static create(branches: any): BranchesModel {
    const newBranches = new BranchesModel(new Identifier(branches._id));

    newBranches._name = branches.name;

    return newBranches;
  }

  static hydrate(branches: any): BranchesModel {
    const newBranches = new BranchesModel(new Identifier(branches._id));

    newBranches._name = branches.name;
    newBranches._address = AddressModel.hydrate(branches.address);
    newBranches._vehicles = branches.vehicles
      ? branches.vehicles.map((vehicle: VehicleModel) =>
          VehicleModel.hydrate(vehicle),
        )
      : [];
    newBranches._tours = branches.tours
      ? branches.tours.map((tour: TourModel) => TourModel.hydrate(tour))
      : [];
    newBranches._users = branches.users
      ? branches.users.map((user: UserModel) => UserModel.hydrate(user))
      : [];

    return newBranches;
  }
}
