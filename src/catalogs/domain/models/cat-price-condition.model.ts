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

    private static initializeRole(role: any): CatPriceConditionModel {
        const newRole = new CatPriceConditionModel(new Identifier(role._id));
        newRole._name = role.name;
        return newRole;
    }

    static create(role: any): CatPriceConditionModel {
        return this.initializeRole(role);
    }

    static hydrate(role: any): CatPriceConditionModel {
        return this.initializeRole(role);
    }
}
