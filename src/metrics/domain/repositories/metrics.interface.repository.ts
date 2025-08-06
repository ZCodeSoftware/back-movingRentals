import {
  BookingDuration,
  CategoryRevenue,
  CategoryUtilization,
  GeneralMetrics,
  MetricsFilters,
  PopularVehicle,
} from '../types/metrics.type';

export interface IMetricsRepository {
  getGeneralMetrics(filters?: MetricsFilters): Promise<GeneralMetrics>;
  getCategoryRevenue(filters?: MetricsFilters): Promise<CategoryRevenue[]>;
  getCategoryUtilization(filters?: MetricsFilters): Promise<CategoryUtilization[]>;
  getBookingDurations(filters?: MetricsFilters): Promise<BookingDuration[]>;
  getPopularVehicles(filters?: MetricsFilters): Promise<PopularVehicle[]>;
}