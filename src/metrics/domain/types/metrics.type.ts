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
  sortBy?: 'revenue' | 'bookingCount' | 'categoryName' | 'utilizationPercentage' | 'duration' | 'count' | 'paymentMethodName';
  sortOrder?: 'asc' | 'desc';
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
  totalExpenses: MetricComparison;
  activeVehicles: MetricComparison;
  monthlyBookings: MetricComparison;
}

export interface CategoryRevenue {
  categoryId: string;
  categoryName: string;
  revenue: number;
}

export type PaymentMethodRevenue = {
  paymentMethodId: string;
  paymentMethodName: string;
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

export type TransactionDetail = {
  type: 'INCOME' | 'EXPENSE';
  date: Date;
  amount: number;
  description: string;
  sourceId: string;
};