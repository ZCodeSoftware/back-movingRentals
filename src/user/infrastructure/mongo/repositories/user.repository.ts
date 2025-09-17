import { HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { Model, Types } from 'mongoose';
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserSchema>,
    @InjectModel('Cart') private readonly cartDB: Model<CartSchema>,
    @Inject(SymbolsCatalogs.ICatRoleRepository)
    private readonly catRoleRepository: ICatRoleRepository,
  ) { }

  async create(user: UserModel, role: string): Promise<UserModel> {
    try {
      if (!role) {
        const userRole = await this.catRoleRepository.findByName(
          TypeRoles.USER,
        );
        user.addRole(userRole);
      } else {
        const roleFound = await this.catRoleRepository.findById(role);
        user.addRole(roleFound);
      }

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

  async findAll(filters: any): Promise<{
    data: UserModel[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    try {
      const query: any = {};
      if (filters.role) {
        query.role =
          typeof filters.role === 'string'
            ? Types.ObjectId.createFromHexString(filters.role)
            : filters.role;
      }

      if (filters.search) {
        const regex = new RegExp(escapeRegex(filters.search), 'i');
        query.$or = [
          { email: regex },
          { name: regex },
          { lastName: regex },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$name', ' ', '$lastName'] },
                regex: escapeRegex(filters.search),
                options: 'i',
              },
            },
          },
        ];
      } else {
        if (filters.email) {
          query.email = { $regex: escapeRegex(filters.email), $options: 'i' };
        }
        if (filters.name) {
          query.name = { $regex: escapeRegex(filters.name), $options: 'i' };
        }
        if (filters.lastName) {
          query.lastName = { $regex: escapeRegex(filters.lastName), $options: 'i' };
        }
      }

      const page =
        parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
      const limit =
        parseInt(filters.limit, 10) > 0 ? parseInt(filters.limit, 10) : 10;
      const skip = (page - 1) * limit;

      delete filters.page;
      delete filters.limit;

      const totalItems = await this.userModel.countDocuments(query);
      const users = await this.userModel
        .find(query)
        .populate('role address.country')
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: users.map((user) => UserModel.hydrate(user)),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
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
        .populate({
          path: 'address',
          populate: {
            path: 'country',
          },
        });

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
