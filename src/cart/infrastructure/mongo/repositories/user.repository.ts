import { HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { UserModel } from '../../../domain/models/user.model';
import { IUserRepository } from '../../../domain/repositories/user.interface.repository';
import { UserSchema } from '../schemas/user.schema';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserSchema>,
  ) { }

  async findByEmail(email: string): Promise<UserModel> {
    try {
      const found = await this.userModel.findOne({ email });

      return found && UserModel.hydrate(found);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findById(id: string): Promise<UserModel> {
    try {
      const found = await this.userModel
        .findById(id)
        .populate('role')

      if (!found) {
        throw new BaseErrorException(
          `The user with ID ${id} does not exist`,
          HttpStatus.NOT_FOUND,
        );
      }
      return UserModel.hydrate(found);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
