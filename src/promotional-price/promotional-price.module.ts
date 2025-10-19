import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { PromotionalPrice, PromotionalPriceSchema } from '../core/infrastructure/mongo/schemas/public/promotional-price.schema';
import { PromotionalPriceController } from './infrastructure/nest/controllers/promotional-price.controller';
import { promotionalPriceProviders } from './infrastructure/nest/constants/custom-provider';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PromotionalPrice.name, schema: PromotionalPriceSchema },
        ]),
        CatalogsModule,
    ],
    controllers: [PromotionalPriceController],
    providers: [...promotionalPriceProviders],
    exports: [...promotionalPriceProviders],
})
export class PromotionalPriceModule {}
