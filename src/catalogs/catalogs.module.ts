import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { roleSchema } from './infrastructure/constants/custom-schema';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';
import {
  catRoleRepository,
  catRoleService,
} from './infrastructure/constants/custom-provider';

@Module({
  imports: [MongooseModule.forFeature([roleSchema])],
  controllers: [CatRoleController],
  providers: [catRoleRepository, catRoleService],
  exports: [],
})
export class CatalogsModule {}
