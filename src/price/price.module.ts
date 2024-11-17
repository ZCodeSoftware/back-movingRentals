import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { catPriceConditionRepository, priceRepository, priceService } from "./infrastructure/nest/constants/custom-provider";
import { catPriceConditionSchema, priceSchema } from "./infrastructure/nest/constants/custom-schema";
import { PriceController } from "./infrastructure/nest/controllers/price.controller";

@Module({
    imports: [MongooseModule.forFeature([
        priceSchema,
        catPriceConditionSchema
    ])],
    controllers: [PriceController],
    providers: [priceRepository, priceService, catPriceConditionRepository],
    exports: []
})

export class PriceModule { }