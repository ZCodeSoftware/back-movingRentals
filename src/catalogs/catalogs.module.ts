import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catDocumentRepository,
  catDocumentService,
  catRoleRepository,
  catRoleService,
} from './infrastructure/constants/custom-provider';
import {
  documentSchema,
  roleSchema,
} from './infrastructure/constants/custom-schema';
import { CatDocumentController } from './infrastructure/nest/controllers/cat-document.controller';
import { CatRoleController } from './infrastructure/nest/controllers/cat-role.controller';

@Module({
  imports: [MongooseModule.forFeature([roleSchema, documentSchema])],
  controllers: [CatRoleController, CatDocumentController],
  providers: [
    catRoleRepository,
    catRoleService,
    catDocumentRepository,
    catDocumentService,
  ],
  exports: [],
})
export class CatalogsModule {}
