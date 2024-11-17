import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatPriceConditionModel extends BaseModel {
    private _name: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            name: this._name,
        };
    }

    private static initializeRole(priceCondition: any): CatPriceConditionModel {
        const newpriceCondition = new CatPriceConditionModel(new Identifier(priceCondition._id));
        newpriceCondition._name = priceCondition.name;
        return newpriceCondition;
    }

    static create(priceCondition: any): CatPriceConditionModel {
        return this.initializeRole(priceCondition);
    }

    static hydrate(priceCondition: any): CatPriceConditionModel {
        return this.initializeRole(priceCondition);
    }
}