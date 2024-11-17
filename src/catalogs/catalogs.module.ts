import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  catCategoryService,
  catRoleRepository,
  catRoleService,
} from './infrastructure/constants/custom-provider';
import { categorySchema, roleSchema } from './infrastructure/constants/custom-schema';
import { CatCategoryController } from './infrastructure/nest/controllers/cat-category.controller';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';

@Module({
  imports: [MongooseModule.forFeature([roleSchema, categorySchema])],
  controllers: [CatRoleController, CatCategoryController],
  providers: [catRoleRepository,
    catRoleService,
    catCategoryRepository,
    catCategoryService
  ],
  exports: [],
})
export class CatalogsModule { }
