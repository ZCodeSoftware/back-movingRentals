import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class CatCountryModel extends BaseModel {
    private _nameEn: string;
    private _nameEs: string;
    private _code: string;

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            nameEn: this._nameEn,
            nameEs: this._nameEs,
            code: this._code
        };
    }

    private static initializeCountry(country: any): CatCountryModel {
        const newCountry = new CatCountryModel(new Identifier(country._id));
        newCountry._nameEn = country.nameEn;
        newCountry._nameEs = country.nameEs;
        newCountry._code = country.code;
        return newCountry;
    }

    static create(country: any): CatCountryModel {
        return this.initializeCountry(country);
    }

    static hydrate(country: any): CatCountryModel {
        return this.initializeCountry(country);
    }
}
