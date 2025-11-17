import { HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import SymbolsAddress from '../../../address/symbols-address';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import config from '../../../config';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import { hashPassword } from '../../../core/domain/utils/bcrypt.util';
import { generatePassword } from '../../../core/domain/utils/generate-password.util';
import { AddressModel } from '../../domain/models/address.model';
import { UserModel } from '../../domain/models/user.model';
import { IAddressRepository } from '../../domain/repositories/address.interface.repository';
import { ICatCountryRepository } from '../../domain/repositories/cat-country.interface.repository';
import { IUserRepository } from '../../domain/repositories/user.interface.repository';
import { IUserService } from '../../domain/services/user.interface.service';
import {
  IAutoCreate,
  IUserCreate,
  IUserUpdate,
} from '../../domain/types/user.type';
import SymbolsUser from '../../symbols-user';

export class UserService implements IUserService {
  constructor(
    @Inject(SymbolsUser.IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(SymbolsAddress.IAddressRepository)
    private readonly addressRepository: IAddressRepository,
    @Inject(SymbolsCatalogs.ICatCountryRepository)
    private readonly catCountryRepository: ICatCountryRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
  ) {}

  async create(user: IUserCreate): Promise<UserModel> {
    try {
      const { role, address, ...rest } = user;
      const foundEmail = await this.userRepository.findByEmail(rest.email);

      if (foundEmail)
        throw new BaseErrorException(
          'This email is already in use',
          HttpStatus.BAD_REQUEST,
        );

      const hashedPassword = await hashPassword(rest.password);

      const userModel = UserModel.create({
        ...rest,
        password: hashedPassword,
        isActive: true,
      });

      const addesModel = AddressModel.create(address);

      const findCountry = await this.catCountryRepository.findById(
        address.countryId,
      );

      addesModel.addCountry(findCountry);

      const addressSave = await this.addressRepository.create(addesModel);

      userModel.addAddress(addressSave);

      const userSave = await this.userRepository.create(userModel, role);

      return userSave;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async autoCreate(
    user: IAutoCreate & { name?: string; lastName?: string; cellphone?: string; address?: { countryId?: string }; countryId?: string },
    frontendHost: string,
    lang: string = 'es',
  ): Promise<UserModel> {
    try {
      const { role, address, countryId, ...rest } = user as any;
      const foundEmail = await this.userRepository.findByEmail(rest.email);
      if (foundEmail)
        throw new BaseErrorException(
          'This email is already in use',
          HttpStatus.BAD_REQUEST,
        );
      const password = generatePassword(8);
      const hashedPassword = await hashPassword(password);
      const userModel = UserModel.create({
        ...rest,
        password: hashedPassword,
        isActive: true,
      });

      // Address creation if country is provided (either nested or root-level countryId)
      const incomingCountryId = address?.countryId || countryId;
      let addressSave = null;
      if (incomingCountryId) {
        const addresModel = AddressModel.create({});
        const findCountry = await this.catCountryRepository.findById(incomingCountryId);
        if (!findCountry) {
          throw new BaseErrorException('Country not found', HttpStatus.BAD_REQUEST);
        }
        addresModel.addCountry(findCountry);
        addressSave = await this.addressRepository.create(addresModel);
      } else {
        // create empty address to maintain required relationship
        const addresModel = AddressModel.create({});
        addressSave = await this.addressRepository.create(addresModel);
      }

      userModel.addAddress(addressSave);

      const userSave = await this.userRepository.create(userModel, role);

      const configuredUrls = config().app.front.front_base_urls;
      
      let validFrontendUrl = configuredUrls.find(
        (url: string) => url.includes(frontendHost),
      );
      
      // Si no se encuentra una URL válida, usar la primera URL configurada como fallback
      if (!validFrontendUrl && configuredUrls.length > 0) {
        validFrontendUrl = configuredUrls[0];
      }

      if (userSave) {
        this.eventEmitter.emit('send-user.auto-create', {
          email: userSave.toJSON().email,
          password,
          frontendHost: validFrontendUrl,
          lang,
        });
      }

      return userSave;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
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
      const users = await this.userRepository.findAll(filters);

      return users;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findAllOnlyUsers(filters: any): Promise<{
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
      const users = await this.userRepository.findAllOnlyUsers(filters);

      return users;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findAllNonUsers(filters: any): Promise<{
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
      const users = await this.userRepository.findAllNonUsers(filters);

      return users;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findByEmail(email: string): Promise<UserModel> {
    try {
      const foundUser = await this.userRepository.findByEmail(email);

      return foundUser;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async findById(id: string): Promise<UserModel> {
    try {
      const foundUser = await this.userRepository.findById(id);

      return foundUser;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async update(id: string, user: IUserUpdate): Promise<UserModel> {
    try {
      const { address, ...rest } = user;
      const userModel = UserModel.create(rest);

      if (address?.countryId) {
        const existingUser = await this.userRepository.findById(id);

        if (!existingUser)
          throw new BaseErrorException(
            `The user with ID ${id} does not exist`,
            HttpStatus.NOT_FOUND,
          );

        const findCountry = await this.catCountryRepository.findById(
          address.countryId,
        );

        if (!findCountry)
          throw new BaseErrorException(
            'Country not found',
            HttpStatus.BAD_REQUEST,
          );

        const addressToUpdate = await this.addressRepository.findById(
          existingUser.toJSON().address._id.toString(),
        );

        if (addressToUpdate) {
          addressToUpdate.addCountry(findCountry);

          const updatedAddress = await this.addressRepository.update(
            existingUser.toJSON().address._id.toString(),
            addressToUpdate,
          );

          userModel.addAddress(updatedAddress);
        } else {
          const newAddress = AddressModel.create({});
          newAddress.addCountry(findCountry);
          const addressSave = await this.addressRepository.create(newAddress);
          userModel.addAddress(addressSave);
        }
      }

      const update = await this.userRepository.update(id, userModel);

      return update;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.userRepository.softDelete(id);
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async forgotPassword(email: string, requestHost: string, lang: string = 'es'): Promise<any> {
    try {
      // Log para debugging
      console.log('=== FORGOT PASSWORD DEBUG ===');
      console.log('Email:', email);
      console.log('RequestHost:', requestHost);
      console.log('Lang:', lang);
      
      const configuredUrls = config().app.front.front_base_urls;
      console.log('Configured URLs:', configuredUrls);
      
      let validFrontendUrl = null;
      
      // Si requestHost está presente, buscar coincidencia exacta
      if (requestHost) {
        validFrontendUrl = configuredUrls.find(
          (url: string) => url === requestHost || url.includes(requestHost) || requestHost.includes(url),
        );
        console.log('Found matching URL:', validFrontendUrl);
      }
      
      // Si aún no hay URL válida, usar la primera URL configurada como fallback
      if (!validFrontendUrl && configuredUrls.length > 0) {
        validFrontendUrl = configuredUrls[0];
        console.log('Using fallback URL:', validFrontendUrl);
      }
      
      // Si no hay URLs configuradas, lanzar error
      if (!validFrontendUrl) {
        throw new BaseErrorException('No frontend URLs configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      const foundUser = await this.userRepository.findByEmail(email);
      console.log('User found:', !!foundUser);

      if (!foundUser)
        throw new BaseErrorException('Invalid request', HttpStatus.BAD_REQUEST);

      const token = this.jwtService.sign(
        { email: foundUser.toJSON().email, _id: foundUser.toJSON()._id },
        {
          expiresIn: '10m',
          secret: config().auth.jwt.secret,
        },
      );

      this.eventEmitter.emit('send-user.forgot-password', {
        email,
        token,
        frontendHost: validFrontendUrl,
        lang,
      });
      return foundUser;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }

  async resetPasswordByAdmin(
    id: string,
    requestHost: string,
    requestingUserId: string,
  ): Promise<any> {
    try {
      // Buscar el usuario objetivo (cuya contraseña se va a restablecer)
      const targetUser = await this.userRepository.findById(id);
      if (!targetUser) {
        throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);
      }

      // Buscar el usuario que está haciendo la petición
      const requestingUser = await this.userRepository.findById(requestingUserId);
      if (!requestingUser) {
        throw new BaseErrorException('Requesting user not found', HttpStatus.NOT_FOUND);
      }

      // Obtener los roles
      const targetUserRole = targetUser.toJSON().role?.name;
      const requestingUserRole = requestingUser.toJSON().role?.name;

      // Validar que un ADMIN no pueda restablecer la contraseña de un SUPERADMIN
      if (requestingUserRole === 'ADMIN' && targetUserRole === 'SUPERADMIN') {
        throw new BaseErrorException(
          'Admin users cannot reset superadmin passwords',
          HttpStatus.FORBIDDEN,
        );
      }

      // Generar una nueva contraseña aleatoria
      const newPassword = generatePassword(8);

      // Actualizar la contraseña del usuario
      // NOTA: No hasheamos aquí porque el repositorio ya lo hace en el método update
      const userModel = UserModel.create({
        password: newPassword,
      });

      await this.userRepository.update(id, userModel);

      return {
        message: 'Password reset successfully',
        email: targetUser.toJSON().email,
        newPassword: newPassword,
      };
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
