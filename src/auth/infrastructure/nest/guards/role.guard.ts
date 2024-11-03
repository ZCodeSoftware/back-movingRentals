import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RoleGuards implements CanActivate {
  constructor() {} // private readonly userService: IUserService, // @Inject(SymbolsUser.IUserService)

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // const findRole = await this.userService.findById(user._id);

    if (user.role.name === TypeRoles.ADMIN) {
      return true;
    } else {
      throw new Error('Acceso denegado: No tienes el rol necesario');
    }
  }
}
