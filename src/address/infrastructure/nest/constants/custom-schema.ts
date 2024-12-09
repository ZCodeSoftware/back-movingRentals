import {
  Address,
  AddressSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/address.schema';

export const addressSchema = {
  name: Address.name,
  schema: AddressSchema,
};
