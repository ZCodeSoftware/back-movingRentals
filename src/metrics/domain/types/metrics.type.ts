export interface MetricsFilters {
  dateFilter?: {
    type: 'day' | 'week' | 'month' | 'year' | 'range';
    startDate?: Date;
    endDate?: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  vehicleType?: string;
  bookingStatus?: string;
  clientType?: 'new' | 'recurring';
  location?: string; // Para transfers
}

export interface MetricComparison {
  current: number;
  previous: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GeneralMetrics {
  activeClients: MetricComparison;
  totalRevenue: MetricComparison;
  activeVehicles: MetricComparison;
  monthlyBookings: MetricComparison;
}

export interface CategoryRevenue {
  categoryId: string;
  categoryName: string;
  revenue: number;
}

export interface CategoryUtilization {
  categoryId: string;
  categoryName: string;
  utilizationPercentage: number;
  totalBookings: number;
  totalAvailable: number;
}

export interface BookingDuration {
  duration: number; // en horas
  count: number;
}

export interface PopularVehicle {
  vehicleId: string;
  tag: string;
  name: string;
  categoryName: string;
  image?: string;
  revenue: number;
  bookingCount: number;
}