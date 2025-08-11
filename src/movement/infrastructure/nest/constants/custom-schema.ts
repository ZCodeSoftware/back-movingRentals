import { Movement, MovementSchema } from '../../../../core/infrastructure/mongo/schemas/public/movement.schema';
import { User, UserSchema } from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { VehicleOwner, VehicleOwnerSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle-owner.schema';

export const movementSchema = {
  name: Movement.name,
  schema: MovementSchema,
};

export const userSchema = {
  name: User.name,
  schema: UserSchema,
}

export const vehicleOwnerSchema = {
  name: VehicleOwner.name,
  schema: VehicleOwnerSchema,
};