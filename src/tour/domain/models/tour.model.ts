import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

export class TourModel extends BaseModel {
  private _name: string;
  private _description: string;
  private _price: number;
  private _itinerary: string;
  private _capacity?: string;
  private _estimatedDuration?: string;
  private _startDates?: string;
  private _images?: string[];
  private _category: CatCategoryModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      description: this._description,
      price: this._price,
      itinerary: this._itinerary,
      capacity: this._capacity,
      estimatedDuration: this._estimatedDuration,
      startDates: this._startDates,
      images: this._images,
      category: this._category ? this._category.toJSON() : null,
    };
  }

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  static create(tour: any): TourModel {
    const newTour = new TourModel(new Identifier(tour._id));
    newTour._name = tour.name;
    newTour._description = tour.description;
    newTour._price = tour.price;
    newTour._itinerary = tour.itinerary;
    newTour._capacity = tour.capacity;
    newTour._estimatedDuration = tour.estimatedDuration;
    newTour._startDates = tour.startDates;
    newTour._images = tour.images;

    return newTour;
  }

  static hydrate(tour: any): TourModel {
    const newTour = new TourModel(new Identifier(tour._id));
    newTour._name = tour.name;
    newTour._description = tour.description;
    newTour._price = tour.price;
    newTour._itinerary = tour.itinerary;
    newTour._capacity = tour.capacity;
    newTour._estimatedDuration = tour.estimatedDuration;
    newTour._startDates = tour.startDates;
    newTour._images = tour.images;
    newTour._category = tour.category ? CatCategoryModel.hydrate(tour.category) : null;

    return newTour;
  }
}
