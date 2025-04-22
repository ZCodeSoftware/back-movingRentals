import { HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import { CartModel } from '../../../../cart/domain/models/cart.model';
import { CartSchema } from '../../../../cart/infrastructure/mongo/schemas/cart.schema';
import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { hashPassword } from '../../../../core/domain/utils/bcrypt.util';
import { UserModel } from '../../../domain/models/user.model';
import { ICatRoleRepository } from '../../../domain/repositories/cat-role.interface.repository';
import { IUserRepository } from '../../../domain/repositories/user.interface.repository';
import { UserSchema } from '../schemas/user.schema';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserSchema>,
    @InjectModel('Cart') private readonly cartDB: Model<CartSchema>,
    @Inject(SymbolsCatalogs.ICatRoleRepository)
    private readonly catRoleRepository: ICatRoleRepository,
  ) { }

  async create(user: UserModel): Promise<UserModel> {
    try {
      const userRole = await this.catRoleRepository.findByName(TypeRoles.USER);
      user.addRole(userRole);

      // Crear el carrito vacío
      const cartModel = CartModel.create({
        travelers: { adults: 0, childrens: 0 },
      });
      const cart = await this.cartDB.create(cartModel.toJSON());

      if (!cart) {
        throw new BaseErrorException(
          "Couldn't create the cart",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const schema = new this.userModel(user.toJSON());
      schema.cart = cart;

      const saved = await schema.save();

      if (!saved) {
        throw new BaseErrorException(
          "Couldn't save the user",
          HttpStatus.BAD_REQUEST,
        );
      }

      return UserModel.hydrate(saved);
    } catch (error) {
      throw new BaseErrorException(
        error.message,
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
        .populate('role documentation')
        .populate({
          path: 'address',
          populate: {
            path: 'country',
          },
        });

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
        .populate('documentation')
        .populate('address');

      if (!existingUser) {
        throw new BaseErrorException(
          `The user with ID ${id} does not exist`,
          HttpStatus.NOT_FOUND,
        );
      }

      const userObj = user.toJSON();
      const existingUserObj = existingUser.toJSON() as any;

      const { createdAt, updatedAt, ...filteredExistingUser } = existingUserObj;
      if (userObj.password) {
        userObj.password = await hashPassword(userObj.password);
      }

      const updatedFields = plainToClass(UserModel, {
        ...filteredExistingUser,
        ...userObj,
        role: filteredExistingUser.role,
        documentation: filteredExistingUser.documentation,
        address: filteredExistingUser.address,
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
