import {
  CatPaymentMethod,
  CatPaymentMethodSchema,
} from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-payment-method.schema';
import {
  Booking,
  BookingSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import {
  User,
  UserSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { Vehicle, VehicleSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';

export const bookingSchema = {
  name: Booking.name,
  schema: BookingSchema,
};

export const paymentMethodSchema = {
  name: CatPaymentMethod.name,
  schema: CatPaymentMethodSchema,
};

export const userSchema = {
  name: User.name,
  schema: UserSchema,
};

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema
}