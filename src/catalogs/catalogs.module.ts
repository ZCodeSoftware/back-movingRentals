import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  catCategoryService,
  catDocumentRepository,
  catDocumentService,
  catPriceConditionRepository,
  catPriceConditionService,
  catRoleRepository,
  catRoleService,
  userRepository,
  userService,
} from './infrastructure/constants/custom-provider';
import {
  categorySchema,
  documentSchema,
  priceConditionSchema,
  roleSchema,
  userSchema,
} from './infrastructure/constants/custom-schema';
import { CatCategoryController } from './infrastructure/nest/controllers/cat-category.controller';
import { CatDocumentController } from './infrastructure/nest/controllers/cat-document.controller';
import { CatPriceConditionController } from './infrastructure/nest/controllers/cat-price-condition.controller';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      roleSchema,
      documentSchema,
      categorySchema,
      priceConditionSchema,
      userSchema,
    ]),
  ],
  controllers: [
    CatRoleController,
    CatDocumentController,
    CatCategoryController,
    CatPriceConditionController,
  ],
  providers: [
    catRoleRepository,
    catRoleService,
    catDocumentRepository,
    catDocumentService,
    catCategoryRepository,
    catCategoryService,
    catPriceConditionRepository,
    catPriceConditionService,
    userRepository,
    userService,
  ],
  exports: [],
})
export class CatalogsModule {}
