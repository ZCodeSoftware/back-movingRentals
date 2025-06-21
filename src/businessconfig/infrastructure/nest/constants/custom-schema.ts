import { BusinessConfigSchema, BusinessConfig } from '../../../../core/infrastructure/mongo/schemas/public/businessconfig.schema';

export const businessconfigSchema = {
  name: BusinessConfig.name,
  schema: BusinessConfigSchema,
};
