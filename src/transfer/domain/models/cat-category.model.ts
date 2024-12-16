import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatCategoryModel extends BaseModel {
    private _name: string;
    private _disclaimer: string;
    private _image: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            name: this._name,
            disclaimer: this._disclaimer,
            image: this._image
        };
    }

    private static initializeRole(category: any): CatCategoryModel {
        const newRole = new CatCategoryModel(new Identifier(category._id));
        newRole._name = category.name;
        newRole._disclaimer = category.disclaimer;
        newRole._image = category.image;
        return newRole;
    }

    static create(category: any): CatCategoryModel {
        return this.initializeRole(category);
    }

    static hydrate(category: any): CatCategoryModel {
        return this.initializeRole(category);
    }
}