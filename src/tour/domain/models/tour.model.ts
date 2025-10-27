import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

interface Translate {
  en?: string;
  es?: string;
}

export class TourModel extends BaseModel {
  private _name: string;
  private _nameTranslations?: Translate;
  private _description: string;
  private _descriptionTranslations?: Translate;
  private _price: number;
  private _itinerary: string;
  private _itineraryTranslations?: Translate;
  private _capacity?: string;
  private _capacityTranslations?: Translate;
  private _estimatedDuration?: string;
  private _estimatedDurationTranslations?: Translate;
  private _startDates?: string;
  private _startDatesTranslations?: Translate;
  private _images?: string[];
  private _isActive: boolean = true;
  private _category: CatCategoryModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      name: this._name,
      nameTranslations: this._nameTranslations,
      description: this._description,
      descriptionTranslations: this._descriptionTranslations,
      price: this._price,
      itinerary: this._itinerary,
      itineraryTranslations: this._itineraryTranslations,
      capacity: this._capacity,
      capacityTranslations: this._capacityTranslations,
      estimatedDuration: this._estimatedDuration,
      estimatedDurationTranslations: this._estimatedDurationTranslations,
      startDates: this._startDates,
      startDatesTranslations: this._startDatesTranslations,
      images: this._images,
      isActive: this._isActive,
      category: this._category ? this._category.toJSON() : null,
    };
  }

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  static create(tour: any): TourModel {
    const newTour = new TourModel(new Identifier(tour._id));
    newTour._name = tour.name;
    newTour._nameTranslations = tour.nameTranslations;
    newTour._description = tour.description;
    newTour._descriptionTranslations = tour.descriptionTranslations;
    newTour._price = tour.price;
    newTour._itinerary = tour.itinerary;
    newTour._itineraryTranslations = tour.itineraryTranslations;
    newTour._capacity = tour.capacity;
    newTour._capacityTranslations = tour.capacityTranslations;
    newTour._estimatedDuration = tour.estimatedDuration;
    newTour._estimatedDurationTranslations = tour.estimatedDurationTranslations;
    newTour._startDates = tour.startDates;
    newTour._startDatesTranslations = tour.startDatesTranslations;
    newTour._images = tour.images;
    newTour._isActive = tour.isActive;

    return newTour;
  }

  static hydrate(tour: any): TourModel {
    const newTour = new TourModel(new Identifier(tour._id));
    newTour._name = tour.name;
    newTour._nameTranslations = tour.nameTranslations;
    newTour._description = tour.description;
    newTour._descriptionTranslations = tour.descriptionTranslations;
    newTour._price = tour.price;
    newTour._itinerary = tour.itinerary;
    newTour._itineraryTranslations = tour.itineraryTranslations;
    newTour._capacity = tour.capacity;
    newTour._capacityTranslations = tour.capacityTranslations;
    newTour._estimatedDuration = tour.estimatedDuration;
    newTour._estimatedDurationTranslations = tour.estimatedDurationTranslations;
    newTour._startDates = tour.startDates;
    newTour._startDatesTranslations = tour.startDatesTranslations;
    newTour._images = tour.images;
    newTour._isActive = tour.isActive;
    newTour._category = tour.category ? CatCategoryModel.hydrate(tour.category) : null;

    return newTour;
  }
}
