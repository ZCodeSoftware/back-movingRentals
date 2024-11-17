import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  catDocumentRepository,
  documentRepository,
  documentService,
} from './infrastructure/constants/custom-provider';
import {
  catDocumentSchema,
  documentSchema,
} from './infrastructure/constants/custom-schema';
import { DocumentController } from './infrastructure/nest/controller/document.repository';

@Module({
  imports: [MongooseModule.forFeature([documentSchema, catDocumentSchema])],
  controllers: [DocumentController],
  providers: [documentRepository, documentService, catDocumentRepository],
  exports: [],
})
export class DocumentModule {}
