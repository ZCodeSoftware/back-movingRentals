import { CatCategory, CatCategorySchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { CatStatus, CatStatusSchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-status.schema';
import { Booking, BookingSchema } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { Cart, CartSchema } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import { Movement, MovementSchema } from '../../../../core/infrastructure/mongo/schemas/public/movement.schema';
import { User, UserSchema } from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { Vehicle, VehicleSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';

export const userSchema = {
  name: User.name,
  schema: UserSchema,
};

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema,
};

export const bookingSchema = {
  name: Booking.name,
  schema: BookingSchema,
};

export const cartSchema = {
  name: Cart.name,
  schema: CartSchema,
};

export const categorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
};

export const statusSchema = {
  name: CatStatus.name,
  schema: CatStatusSchema,
};

export const movementSchema = {
  name: Movement.name,
  schema: MovementSchema,
};