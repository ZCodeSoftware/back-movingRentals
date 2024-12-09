import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatCategoryModel } from './cat-category.model';

export class TourModel extends BaseModel {
  private _description: string;
  private _recommendations?: string;
  private _includes: string;
  private _images?: string[];
  private _category: CatCategoryModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      description: this._description,
      recommendations: this._recommendations,
      includes: this._includes,
      images: this._images,
      category: this._category ? this._category.toJSON() : null,
    };
  }

  addCategory(category: CatCategoryModel) {
    this._category = category;
  }

  static create(tour: any): TourModel {
    const newTour = new TourModel(new Identifier(tour._id));
    newTour._description = tour.description;
    newTour._recommendations = tour.recommendations;
    newTour._includes = tour.includes;
    newTour._images = tour.images;

    return newTour;
  }

  static hydrate(tour: any): TourModel {
    const newTour = new TourModel(new Identifier(tour._id));
    newTour._description = tour.description;
    newTour._recommendations = tour.recommendations;
    newTour._includes = tour.includes;
    newTour._images = tour.images;
    newTour._category = tour.category ? CatCategoryModel.hydrate(tour.category) : null;

    return newTour;
  }
}
