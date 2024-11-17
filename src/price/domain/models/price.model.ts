import { BaseModel } from "../../../core/domain/models/base.model";
import { Identifier } from "../../../core/domain/value-objects/identifier";
import { CatPriceConditionModel } from "./cat-price-condition.model";

export class PriceModel extends BaseModel {
    private _amount: number;
    private _priceCondition: CatPriceConditionModel

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            amount: this._amount,
            priceCondition: this._priceCondition ? this._priceCondition.toJSON() : null,
        };
    }

    addPriceCondition(priceCondition: CatPriceConditionModel) {
        this._priceCondition = priceCondition;
    }

    static create(price: any): PriceModel {
        const newPrice = new PriceModel(new Identifier(price._id));

        newPrice._amount = price.amount;

        return newPrice;
    }

    static hydrate(price: any): PriceModel {
        const newPrice = new PriceModel(new Identifier(price._id));

        newPrice._amount = price.amount;
        newPrice._priceCondition = price.priceCondition ? CatPriceConditionModel.hydrate(price.priceCondition) : null;

        return newPrice;
    }
}