import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catCategoryRepository,
  catCategoryService,
  catDocumentRepository,
  catDocumentService,
  catPaymentMethodRepository,
  catPaymentMethodService,
  catPriceConditionRepository,
  catPriceConditionService,
  catRoleRepository,
  catRoleService,
  userRepository,
  userService,
} from './infrastructure/constants/custom-provider';
import {
  cartSchema,
  categorySchema,
  documentSchema,
  paymentMethodSchema,
  priceConditionSchema,
  roleSchema,
  userSchema,
} from './infrastructure/constants/custom-schema';
import { CatCategoryController } from './infrastructure/nest/controllers/cat-category.controller';
import { CatDocumentController } from './infrastructure/nest/controllers/cat-document.controller';
import { CatPaymentMethodController } from './infrastructure/nest/controllers/cat-payment-method.controller';
import { CatPriceConditionController } from './infrastructure/nest/controllers/cat-price-condition.controller';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      roleSchema,
      documentSchema,
      categorySchema,
      priceConditionSchema,
      paymentMethodSchema,
      userSchema,
      cartSchema
    ]),
  ],
  controllers: [
    CatRoleController,
    CatDocumentController,
    CatCategoryController,
    CatPriceConditionController,
    CatPaymentMethodController,
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
    catPaymentMethodRepository,
    catPaymentMethodService,
    userRepository,
    userService,
  ],
  exports: [],
})
export class CatalogsModule { }
