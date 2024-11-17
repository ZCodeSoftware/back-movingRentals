import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  catCategoryService,
  catDocumentRepository,
  catDocumentService,
  catRoleRepository,
  catRoleService,
} from './infrastructure/constants/custom-provider';
import {
  categorySchema,
  documentSchema,
  roleSchema,
} from './infrastructure/constants/custom-schema';
import { CatCategoryController } from './infrastructure/nest/controllers/cat-category.controller';
import { CatDocumentController } from './infrastructure/nest/controllers/cat-document.controller';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';

@Module({
  imports: [
    MongooseModule.forFeature([roleSchema, documentSchema, categorySchema]),
  ],
  controllers: [
    CatRoleController,
    CatDocumentController,
    CatCategoryController,
  ],
  providers: [
    catRoleRepository,
    catRoleService,
    catDocumentRepository,
    catDocumentService,
    catCategoryRepository,
    catCategoryService,
  ],
  exports: [],
})
export class CatalogsModule {}
