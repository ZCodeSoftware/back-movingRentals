import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatStatusModel extends BaseModel {
    private _name: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            name: this._name,
        };
    }

    private static initializeStatus(status: any): CatStatusModel {
        const newStatus = new CatStatusModel(new Identifier(status._id));
        newStatus._name = status.name;
        return newStatus;
    }

    static create(status: any): CatStatusModel {
        return this.initializeStatus(status);
    }

    static hydrate(status: any): CatStatusModel {
        return this.initializeStatus(status);
    }
}
