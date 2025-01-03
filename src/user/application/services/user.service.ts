import { HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators/core';
import SymbolsAddress from '../../../address/symbols-address';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
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
  ) {}

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
      const userModel = UserModel.create(user);

      const update = await this.userRepository.update(id, userModel);

      return update;
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
