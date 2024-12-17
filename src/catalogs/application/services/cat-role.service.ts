import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CatRoleModel } from '../../../catalogs/domain/models/cat-role.model';
import { ICatRoleRepository } from '../../../catalogs/domain/repositories/cat-role.interface.repository';
import { ICatRoleService } from '../../../catalogs/domain/services/catalogs.interface.service';
import { ICatRoleCreate } from '../../../catalogs/domain/types/cat-role.type';
import SymbolsCatalogs from '../../symbols-catalogs';

@Injectable()
export class CatRoleService implements ICatRoleService {
  constructor(
    @Inject(SymbolsCatalogs.ICatRoleRepository)
    private readonly catRoleRepository: ICatRoleRepository,
  ) { }

  async findAll(): Promise<CatRoleModel[]> {
    try {
      return await this.catRoleRepository.findAll();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async create(catRole: ICatRoleCreate): Promise<CatRoleModel> {
    try {
      const roleCreated = await this.catRoleRepository.findByName(catRole.name);

      if (roleCreated) throw new Error('This role already exists');

      const roleModel = CatRoleModel.create({ name: catRole.name });

      return await this.catRoleRepository.create(roleModel);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async delete(catRoleId: string): Promise<{ message: string }> {
    try {
      const result = await this.catRoleRepository.delete(catRoleId);

      if (result === 0) {
        throw new Error('Role not found');
      }

      return {
        message: 'Role deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
