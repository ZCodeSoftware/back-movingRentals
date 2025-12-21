import { Inject, Injectable } from '@nestjs/common';
import { IMetricsRepository } from '../../domain/repositories/metrics.interface.repository';
import { IMetricsService } from '../../domain/services/metrics.interface.service';
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
} from '../../domain/types/metrics.type';
import SymbolsMetrics from '../../symbols-metrics';

@Injectable()
export class MetricsService implements IMetricsService {
  constructor(
    @Inject(SymbolsMetrics.IMetricsRepository)
    private readonly metricsRepository: IMetricsRepository,
  ) { }

  async getGeneralMetrics(filters?: MetricsFilters): Promise<GeneralMetrics> {
    return await this.metricsRepository.getGeneralMetrics(filters);
  }

  async getCategoryRevenue(filters?: MetricsFilters): Promise<CategoryRevenue[]> {
    return await this.metricsRepository.getCategoryRevenue(filters);
  }

  async getPaymentMethodRevenue(filters?: MetricsFilters): Promise<PaymentMethodRevenue[]> {
    return await this.metricsRepository.getPaymentMethodRevenue(filters);
  }

  async getCategoryUtilization(filters?: MetricsFilters): Promise<CategoryUtilization[]> {
    return await this.metricsRepository.getCategoryUtilization(filters);
  }

  async getBookingDurations(filters?: MetricsFilters): Promise<BookingDuration[]> {
    return await this.metricsRepository.getBookingDurations(filters);
  }

  async getPopularVehicles(filters?: MetricsFilters): Promise<PopularVehicle[]> {
    return await this.metricsRepository.getPopularVehicles(filters);
  }

  async getTransactionDetails(filters?: MetricsFilters): Promise<TransactionDetail[]> {
    return await this.metricsRepository.getTransactionDetails(filters);
  }

  async getVehicleFinancialDetails(vehicleId: string, filters?: MetricsFilters): Promise<TransactionDetail[]> {
    return await this.metricsRepository.getVehicleFinancialDetails(vehicleId, filters);
  }

  async getVehicleExpenses(filters?: MetricsFilters): Promise<VehicleExpenses[]> {
    return await this.metricsRepository.getVehicleExpenses(filters);
  }

}