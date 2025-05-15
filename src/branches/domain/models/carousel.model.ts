import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { VehicleModel } from './vehicle.model';

export class CarouselModel extends BaseModel {
    private _vehicle: VehicleModel;
    private _description?: string;
    private _colors: string[];

    public toJSON() {
        const aggregate = this._id ? { _id: this._id.toValue() } : {};
        return {
            ...aggregate,
            vehicle: this._vehicle ? this._vehicle.toJSON() : {},
            description: this._description,
            colors: this._colors,
        };
    }

    addVehicle(vehicle: VehicleModel) {
        this._vehicle = vehicle;
    }

    static create(carousel: any): CarouselModel {
        const newCarousel = new CarouselModel(new Identifier(carousel._id));
        newCarousel._description = carousel.description;
        newCarousel._colors = carousel.colors || [];

        return newCarousel;
    }

    static hydrate(carousel: any): CarouselModel {
        const newCarousel = new CarouselModel(new Identifier(carousel._id));
        newCarousel._description = carousel.description;
        newCarousel._colors = carousel.colors || [];
        newCarousel._vehicle = carousel.vehicle
            ? VehicleModel.hydrate(carousel.vehicle)
            : null;
        return newCarousel;
    }
}