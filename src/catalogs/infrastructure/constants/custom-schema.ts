import {
  CatRole,
  CatRoleSchema,
} from '../../../core/infrastructure/mongo/schemas/catalogs/cat-role.schema';

export const roleSchema = {
  name: CatRole.name,
  schema: CatRoleSchema,
};
