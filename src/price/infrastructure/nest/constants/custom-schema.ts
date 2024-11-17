import { CatPriceCondition, CatPriceConditionSchema } from "../../../../core/infrastructure/mongo/schemas/catalogs/cat-price-condition.schema";
import { Price, PriceSchema } from "../../../../core/infrastructure/mongo/schemas/public/price.schema";

export const priceSchema = {
    name: Price.name,
    schema: PriceSchema,
}

export const catPriceConditionSchema = {
    name: CatPriceCondition.name,
    schema: CatPriceConditionSchema,
}