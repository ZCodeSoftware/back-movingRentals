import { MetricsService } from '../../../application/services/metrics.service';
import { MetricsRepository } from '../../mongo/repositories/metrics.repository';
import SymbolsMetrics from '../../../symbols-metrics';

export const metricsService = {
  provide: SymbolsMetrics.IMetricsService,
  useClass: MetricsService,
};

export const metricsRepository = {
  provide: SymbolsMetrics.IMetricsRepository,
  useClass: MetricsRepository,
};