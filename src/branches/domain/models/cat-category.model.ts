import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatCategoryModel extends BaseModel {
    private _name: string;
    private _disclaimer: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            name: this._name,
            disclaimer: this._disclaimer,
        };
    }

    private static initializeCategory(category: any): CatCategoryModel {
        const newCategory = new CatCategoryModel(new Identifier(category._id));
        newCategory._name = category.name;
        newCategory._disclaimer = category.disclaimer;
        return newCategory;
    }

    static create(category: any): CatCategoryModel {
        return this.initializeCategory(category);
    }

    static hydrate(category: any): CatCategoryModel {
        return this.initializeCategory(category);
    }
}
