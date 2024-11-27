import { HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { UserModel } from '../../../domain/models/user.model';
import { ICatRoleRepository } from '../../../domain/repositories/cat-role.interface.repository';
import { IUserRepository } from '../../../domain/repositories/user.interface.repository';
import { UserSchema } from '../schemas/user.schema';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserSchema>,
    @Inject(SymbolsCatalogs.ICatRoleRepository)
    private readonly catRoleRepository: ICatRoleRepository,
  ) {}

  async create(user: UserModel): Promise<UserModel> {
    try {
      const userRole = await this.catRoleRepository.findByName(TypeRoles.USER);
      user.addRole(userRole);

      const schema = new this.userModel(user.toJSON());

      const saved = await schema.save();

      if (!saved) {
        throw new BaseErrorException(
          "Couldn't save the user",
          HttpStatus.BAD_REQUEST,
        );
      }

      return UserModel.hydrate(saved);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findByEmail(email: string): Promise<UserModel> {
    try {
      const found = await this.userModel.findOne({ email }).populate('role');

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
        .populate('documentation');

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

  async update(id: string, user: UserModel): Promise<UserModel> {
    try {
      const existingUser = await this.userModel
        .findById(id)
        .populate('role')
        .populate('documentation');

      if (!existingUser) {
        throw new BaseErrorException(
          `The user with ID ${id} does not exist`,
          HttpStatus.NOT_FOUND,
        );
      }

      const userObj = user.toJSON();
      const existingUserObj = existingUser.toJSON() as any;

      const { createdAt, updatedAt, ...filteredExistingUser } = existingUserObj;

      const updatedFields = plainToClass(UserModel, {
        ...filteredExistingUser,
        ...userObj,
        role: filteredExistingUser.role,
        documentation: filteredExistingUser.documentation,
      });

      const updated = await this.userModel.findByIdAndUpdate(
        id,
        updatedFields,
        {
          new: true,
        },
      );

      if (!updated) {
        throw new BaseErrorException(
          "Couldn't update the user",
          HttpStatus.BAD_REQUEST,
        );
      }

      return UserModel.hydrate(updated);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}