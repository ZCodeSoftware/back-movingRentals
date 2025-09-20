import { CallHandler, ExecutionContext, HttpStatus, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import SymbolsUser from '../../../../user/symbols-user';
import { IUserRepository } from '../../../domain/repositories/user.interface.repository';

@Injectable()
export class AuthStatusInterceptor implements NestInterceptor {
  constructor(
    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req: any = context.switchToHttp().getRequest();

    // Apply only for authenticated endpoints (AuthGuards sets req.user)
    if (!req?.user) {
      return next.handle();
    }

    // Token payload only contains identifiers, not status flags
    const userId: string = req.user?._id || req.user?.userId;
    if (!userId) {
      throw new BaseErrorException('INVALID_TOKEN', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Will throw/not find if soft-deleted due to global mongoose filter
      const user = await this.userRepository.findById(userId);
      const json = user?.toJSON?.();

      if (!json || json.isActive === false) {
        // If inactive -> blocked
        throw new BaseErrorException('USER_BLOCKED', HttpStatus.UNAUTHORIZED);
      }

      // Active and not deleted -> continue
      return next.handle();
    } catch (error) {
      // Not found by soft delete or any repository error -> treat as deleted
      throw new BaseErrorException('USER_DELETED', HttpStatus.UNAUTHORIZED);
    }
  }
}
