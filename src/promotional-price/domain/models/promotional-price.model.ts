import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatModelModel } from '../../../vehicle/domain/models/cat-model.model';

export class PromotionalPriceModel extends BaseModel {
    private _model: CatModelModel;
    private _startDate: Date;
    private _endDate: Date;
    private _price?: number;
    private _pricePer4?: number;
    private _pricePer8?: number;
    private _pricePer24?: number;
    private _pricePerWeek?: number;
    private _pricePerMonth?: number;
    private _isActive: boolean = true;
    private _description?: string;

    /**
     * Formatea una fecha en la zona horaria de México (America/Mexico_City)
     * Devuelve la fecha en formato ISO pero ajustada a la hora de México
     */
    private formatDateForMexico(date: Date): string {
        if (!date) return null;
        
        // Convertir la fecha a la zona horaria de México
        const mexicoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        
        // Obtener los componentes de la fecha en México
        const year = mexicoDate.getFullYear();
        const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
        const day = String(mexicoDate.getDate()).padStart(2, '0');
        const hours = String(mexicoDate.getHours()).padStart(2, '0');
        const minutes = String(mexicoDate.getMinutes()).padStart(2, '0');
        const seconds = String(mexicoDate.getSeconds()).padStart(2, '0');
        
        // Devolver en formato ISO pero con la hora de México
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    }

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            model: this._model ? this._model.toJSON() : {},
            startDate: this._startDate ? this.formatDateForMexico(this._startDate) : null,
            endDate: this._endDate ? this.formatDateForMexico(this._endDate) : null,
            price: this._price,
            pricePer4: this._pricePer4,
            pricePer8: this._pricePer8,
            pricePer24: this._pricePer24,
            pricePerWeek: this._pricePerWeek,
            pricePerMonth: this._pricePerMonth,
            isActive: this._isActive,
            description: this._description,
        };
    }

    addModel(model: CatModelModel) {
        this._model = model;
    }

    static create(data: any): PromotionalPriceModel {
        const newPromotionalPrice = new PromotionalPriceModel(new Identifier(data._id));
        newPromotionalPrice._startDate = data.startDate;
        newPromotionalPrice._endDate = data.endDate;
        newPromotionalPrice._price = data.price;
        newPromotionalPrice._pricePer4 = data.pricePer4;
        newPromotionalPrice._pricePer8 = data.pricePer8;
        newPromotionalPrice._pricePer24 = data.pricePer24;
        newPromotionalPrice._pricePerWeek = data.pricePerWeek;
        newPromotionalPrice._pricePerMonth = data.pricePerMonth;
        newPromotionalPrice._isActive = data.isActive !== undefined ? data.isActive : true;
        newPromotionalPrice._description = data.description;
        return newPromotionalPrice;
    }

    static hydrate(data: any): PromotionalPriceModel {
        const newPromotionalPrice = new PromotionalPriceModel(new Identifier(data._id));
        newPromotionalPrice._model = data.model ? CatModelModel.hydrate(data.model) : null;
        newPromotionalPrice._startDate = data.startDate;
        newPromotionalPrice._endDate = data.endDate;
        newPromotionalPrice._price = data.price;
        newPromotionalPrice._pricePer4 = data.pricePer4;
        newPromotionalPrice._pricePer8 = data.pricePer8;
        newPromotionalPrice._pricePer24 = data.pricePer24;
        newPromotionalPrice._pricePerWeek = data.pricePerWeek;
        newPromotionalPrice._pricePerMonth = data.pricePerMonth;
        newPromotionalPrice._isActive = data.isActive;
        newPromotionalPrice._description = data.description;
        return newPromotionalPrice;
    }
}
