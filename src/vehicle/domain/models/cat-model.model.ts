import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatModelModel extends BaseModel {
    private _name: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            name: this._name,
        };
    }

    private static initializeRole(model: any): CatModelModel {
        const newRole = new CatModelModel(new Identifier(model._id));
        newRole._name = model.name;

        return newRole;
    }

    static create(model: any): CatModelModel {
        return this.initializeRole(model);
    }

    static hydrate(model: any): CatModelModel {
        return this.initializeRole(model);
    }
}
