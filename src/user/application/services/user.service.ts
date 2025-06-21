import { HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import SymbolsAddress from '../../../address/symbols-address';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import config from '../../../config';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import { hashPassword } from '../../../core/domain/utils/bcrypt.util';
import { AddressModel } from '../../domain/models/address.model';
import { UserModel } from '../../domain/models/user.model';
import { IAddressRepository } from '../../domain/repositories/address.interface.repository';
import { ICatCountryRepository } from '../../domain/repositories/cat-country.interface.repository';
import { IUserRepository } from '../../domain/repositories/user.interface.repository';
import { IUserService } from '../../domain/services/user.interface.service';
import { IUserCreate, IUserUpdate } from '../../domain/types/user.type';
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
    private readonly jwtService: JwtService
  ) { }

  async create(user: IUserCreate): Promise<UserModel> {
    try {
      const foundEmail = await this.userRepository.findByEmail(user.email);

      if (foundEmail)
        throw new BaseErrorException(
          'This email is already in use',
          HttpStatus.BAD_REQUEST,
        );

      const hashedPassword = await hashPassword(user.password);

      const userModel = UserModel.create({
        ...user,
        password: hashedPassword,
        isActive: true,
      });

      const addesModel = AddressModel.create(user.address);

      const findCountry = await this.catCountryRepository.findById(
        user.address.countryId,
      );

      addesModel.addCountry(findCountry);

      const addressSave = await this.addressRepository.create(addesModel);

      userModel.addAddress(addressSave);

      const userSave = await this.userRepository.create(userModel);

      return userSave;
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
          existingUser.toJSON().address._id.toString()
        )

        if (addressToUpdate) {
          addressToUpdate.addCountry(findCountry);

          const updatedAddress = await this.addressRepository.update(
            existingUser.toJSON().address._id.toString(),
            addressToUpdate
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

  async forgotPassword(email: string, requestHost: string): Promise<any> {
    try {
      const validFrontendUrl = config().app.front.front_base_urls.find(
        (url: string) => url.includes(requestHost),
      );
      if (!validFrontendUrl)
        throw new BaseErrorException(
          'Invalid request',
          HttpStatus.BAD_REQUEST,
        );
      const foundUser = await this.userRepository.findByEmail(email);

      if (!foundUser)
        throw new BaseErrorException(
          'Invalid request',
          HttpStatus.BAD_REQUEST,
        );

      const token = this.jwtService.sign(
        { email: foundUser.toJSON().email, _id: foundUser.toJSON()._id },
        {
          expiresIn: '10m',
          secret: config().auth.jwt.secret,
        },
      )

      this.eventEmitter.emit('send-user.forgot-password', {
        email,
        token,
        frontendHost: validFrontendUrl,
      })
      return foundUser;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
