import { Booking, BookingSchema } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { CartVersion, CartVersionSchema } from '../../../../core/infrastructure/mongo/schemas/public/cart-version.version';
import { Cart, CartSchema } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import { ContractHistory, ContractHistorySchema } from '../../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { Contract, ContractSchema } from '../../../../core/infrastructure/mongo/schemas/public/contract.schema';
import { Vehicle, VehicleSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';

export const contractSchema = {
  name: Contract.name,
  schema: ContractSchema,
};

export const cartSchema = {
  name: Cart.name,
  schema: CartSchema,
};

export const cartVersionSchema = {
  name: CartVersion.name,
  schema: CartVersionSchema,
};

export const contractHistorySchema = {
  name: ContractHistory.name,
  schema: ContractHistorySchema,
};

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema,
};

export const bookingSchema = {
  name: Booking.name,
  schema: BookingSchema,
}