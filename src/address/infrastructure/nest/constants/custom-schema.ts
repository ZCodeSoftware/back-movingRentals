import {
  CatCountry,
  CatCountrySchema,
} from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-country.schema';
import {
  Address,
  AddressSchema,
} from '../../../../core/infrastructure/mongo/schemas/public/address.schema';

export const addressSchema = {
  name: Address.name,
  schema: AddressSchema,
};

export const countrySchema = {
  name: CatCountry.name,
  schema: CatCountrySchema,
};
