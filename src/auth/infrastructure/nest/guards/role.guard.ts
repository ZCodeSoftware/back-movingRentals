import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRepository } from '../../../domain/repositories/user.interface.repository';

import SymbolsUser from '../../../../user/symbols-user';
import { ROLES_KEY } from '../decorators/role.decorator';


@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new BaseErrorException(`User doesn't exist`, HttpStatus.NOT_FOUND);
    }

    const findRole = await this.userRepository.findById(user._id);
    const userRole = findRole.toJSON().role.name;

    // SUPERADMIN tiene acceso a todo sin restricciones
    if (userRole === TypeRoles.SUPERADMIN) {
      return true;
    }

    if (roles.includes(userRole)) {
      return true;
    } else {
      throw new BaseErrorException(
        'Insufficient permissions',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}