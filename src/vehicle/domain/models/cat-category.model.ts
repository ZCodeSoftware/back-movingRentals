import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatCategoryModel extends BaseModel {
    private _name: string;
    private _disclaimerEn: string;
    private _disclaimerEs: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            name: this._name,
            disclaimerEn: this._disclaimerEn,
            disclaimerEs: this._disclaimerEs,
        };
    }

    private static initializeCategory(category: any): CatCategoryModel {
        const newCategory = new CatCategoryModel(new Identifier(category._id));
        newCategory._name = category.name;
        newCategory._disclaimerEn = category.disclaimerEn;
        newCategory._disclaimerEs = category.disclaimerEs;
        return newCategory;
    }

    static create(category: any): CatCategoryModel {
        return this.initializeCategory(category);
    }

    static hydrate(category: any): CatCategoryModel {
        return this.initializeCategory(category);
    }
}
