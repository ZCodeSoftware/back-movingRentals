import { Commission, CommissionSchema } from '../../../../core/infrastructure/mongo/schemas/public/commission.schema';
import { User, UserSchema } from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { Vehicle, VehicleSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';
import { VehicleOwner, VehicleOwnerSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle-owner.schema';
import { Booking } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { BookingSchema } from '../../../../booking/infrastructure/mongo/schemas/booking.schema';

export const commissionSchema = {
  name: Commission.name,
  schema: CommissionSchema,
};

export const userSchema = {
  name: User.name,
  schema: UserSchema,
};

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema,
};

export const vehicleOwnerSchema = {
  name: VehicleOwner.name,
  schema: VehicleOwnerSchema,
};

export const bookingSchema = {
  name: Booking.name,
  schema: BookingSchema,
};
