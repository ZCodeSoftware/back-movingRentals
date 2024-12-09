import { TourModel } from '../models/tour.model';

export interface ITourRepository {
  findById(id: string): Promise<TourModel>;
}
