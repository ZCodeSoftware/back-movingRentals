import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  addressRepository,
  catCategoryRepository,
  catCategoryService,
  catDocumentRepository,
  catDocumentService,
  catModelRepository,
  catModelService,
  catPaymentMethodRepository,
  catPaymentMethodService,
  catPriceConditionRepository,
  catPriceConditionService,
  catRoleRepository,
  catRoleService,
  catStatusRepository,
  catStatusService,
  countryRepository,
  countryService,
  userRepository,
  userService,
} from './infrastructure/constants/custom-provider';
import {
  addressSchema,
  cartSchema,
  categorySchema,
  catModelSchema,
  catStatusSchema,
  countrySchema,
  documentSchema,
  paymentMethodSchema,
  priceConditionSchema,
  roleSchema,
  userSchema,
} from './infrastructure/constants/custom-schema';
import { CatCategoryController } from './infrastructure/nest/controllers/cat-category.controller';
import { CatCountryController } from './infrastructure/nest/controllers/cat-country.controller';
import { CatDocumentController } from './infrastructure/nest/controllers/cat-document.controller';
import { CatModelController } from './infrastructure/nest/controllers/cat-model.controller';
import { CatPaymentMethodController } from './infrastructure/nest/controllers/cat-payment-method.controller';
import { CatPriceConditionController } from './infrastructure/nest/controllers/cat-price-condition.controller';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';
import { CatStatusController } from './infrastructure/nest/controllers/cat-status.controller';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      roleSchema,
      documentSchema,
      categorySchema,
      priceConditionSchema,
      paymentMethodSchema,
      userSchema,
      cartSchema,
      countrySchema,
      addressSchema,
      catModelSchema,
      catStatusSchema
    ]),
  ],
  controllers: [
    CatRoleController,
    CatDocumentController,
    CatCategoryController,
    CatPriceConditionController,
    CatPaymentMethodController,
    CatCountryController,
    CatModelController,
    CatStatusController
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
    countryRepository,
    countryService,
    addressRepository,
    catModelRepository,
    catModelService,
    catStatusRepository,
    catStatusService
  ],
  exports: [],
})
export class CatalogsModule { }
