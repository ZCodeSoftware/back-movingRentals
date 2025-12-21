import {
  BookingDuration,
  CategoryRevenue,
  CategoryUtilization,
  GeneralMetrics,
  MetricsFilters,
  PaymentMethodRevenue,
  PopularVehicle,
  TransactionDetail,
  VehicleExpenses,
} from '../types/metrics.type';

export interface IMetricsService {
  getGeneralMetrics(filters?: MetricsFilters): Promise<GeneralMetrics>;
  getCategoryRevenue(filters?: MetricsFilters): Promise<CategoryRevenue[]>;
  getCategoryUtilization(filters?: MetricsFilters): Promise<CategoryUtilization[]>;
  getBookingDurations(filters?: MetricsFilters): Promise<BookingDuration[]>;
  getPopularVehicles(filters?: MetricsFilters): Promise<PopularVehicle[]>;
  getPaymentMethodRevenue(filters?: MetricsFilters): Promise<PaymentMethodRevenue[]>;
  getTransactionDetails(filters?: MetricsFilters): Promise<{ data: TransactionDetail[]; total: number; page: number; limit: number; totalPages: number }>;
  getVehicleFinancialDetails(vehicleId: string, filters?: MetricsFilters): Promise<TransactionDetail[]>;
  getVehicleExpenses(filters?: MetricsFilters): Promise<VehicleExpenses[]>;
}