import { MovementSchema, Movement } from '../../../../core/infrastructure/mongo/schemas/public/movement.schema';

export const movementSchema = {
  name: Movement.name,
  schema: MovementSchema,
};
