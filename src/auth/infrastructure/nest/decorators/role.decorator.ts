import { SetMetadata } from '@nestjs/common';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';

export const ROLES_KEY = 'ROLES';
export const Roles = (...roles: TypeRoles[]) => SetMetadata(ROLES_KEY, roles);