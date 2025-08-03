import { CatCategory, CatCategorySchema } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { Branches, BranchesSchema } from '../../../../core/infrastructure/mongo/schemas/public/branches.schema';
import { Cart, CartSchema } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import { Ticket, TicketSchema } from '../../../../core/infrastructure/mongo/schemas/public/ticket.schema';
import { Tour, TourSchema } from '../../../../core/infrastructure/mongo/schemas/public/tour.schema';
import { Transfer, TransferSchema } from '../../../../core/infrastructure/mongo/schemas/public/transfer.schema';
import { User, UserSchema } from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { Vehicle, VehicleSchema } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';

export const cartSchema = {
  name: Cart.name,
  schema: CartSchema,
};

export const branchesSchema = {
  name: Branches.name,
  schema: BranchesSchema,
};

export const tourSchema = {
  name: Tour.name,
  schema: TourSchema,
};

export const catCategorySchema = {
  name: CatCategory.name,
  schema: CatCategorySchema,
}

export const vehicleSchema = {
  name: Vehicle.name,
  schema: VehicleSchema,
};

export const transferSchema = {
  name: Transfer.name,
  schema: TransferSchema,
};

export const ticketSchema = {
  name: Ticket.name,
  schema: TicketSchema,
}

export const userSchema = {
  name: User.name,
  schema: UserSchema
}