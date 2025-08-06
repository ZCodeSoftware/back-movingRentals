import { Inject, Injectable } from '@nestjs/common';
import {
  BookingDuration,
  CategoryRevenue,
  CategoryUtilization,
  GeneralMetrics,
  MetricsFilters,
  PopularVehicle,
} from '../../domain/types/metrics.type';
import { IMetricsRepository } from '../../domain/repositories/metrics.interface.repository';
import { IMetricsService } from '../../domain/services/metrics.interface.service';
import SymbolsMetrics from '../../symbols-metrics';

@Injectable()
export class MetricsService implements IMetricsService {
  constructor(
    @Inject(SymbolsMetrics.IMetricsRepository)
    private readonly metricsRepository: IMetricsRepository,
  ) {}

  async getGeneralMetrics(filters?: MetricsFilters): Promise<GeneralMetrics> {
    return await this.metricsRepository.getGeneralMetrics(filters);
  }

  async getCategoryRevenue(filters?: MetricsFilters): Promise<CategoryRevenue[]> {
    return await this.metricsRepository.getCategoryRevenue(filters);
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
}