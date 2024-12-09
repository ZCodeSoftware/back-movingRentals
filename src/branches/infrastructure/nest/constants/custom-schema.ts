import {
  Address,
  AddressSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/address.schema';
import {
  Branches,
  BranchesSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/branches.schema';
import {
  Tour,
  TourSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/tour.schema';
import {
  User,
  UserSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import {
  Vehicle,
  VehicleSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';

export const branchesSchema = {
  name: Branches.name,
  schema: BranchesSchema,
};

export const addressSchema = {
  name: Address.name,
  schema: AddressSchema,
};

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema,
};

export const tourSchema = {
  name: Tour.name,
  schema: TourSchema,
};

export const userSchema = {
  name: User.name,
  schema: UserSchema,
};
