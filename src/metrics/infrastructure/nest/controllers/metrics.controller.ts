import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import { 
  ApiTags, 
  ApiResponse, 
  ApiOperation, 
  ApiQuery,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { IMetricsService } from '../../../domain/services/metrics.interface.service';
import { MetricsFiltersDTO } from '../dtos/metrics.dto';
import { MetricsFilters } from '../../../domain/types/metrics.type';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import SymbolsMetrics from '../../../symbols-metrics';

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
@Roles(TypeRoles.SUPERADMIN)
@UseGuards(AuthGuards, RoleGuard)
@ApiUnauthorizedResponse({ 
  description: 'Unauthorized - Invalid or missing authentication token',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 401 },
      message: { type: 'string', example: 'Unauthorized' },
      error: { type: 'string', example: 'Unauthorized' }
    }
  }
})
@ApiForbiddenResponse({ 
  description: 'Forbidden - Insufficient permissions (SUPERADMIN role required)',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 403 },
      message: { type: 'string', example: 'Forbidden resource' },
      error: { type: 'string', example: 'Forbidden' }
    }
  }
})
@ApiBadRequestResponse({ 
  description: 'Bad Request - Invalid query parameters',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      message: { type: 'array', items: { type: 'string' }, example: ['dateFilterType must be one of the following values: day, week, month, year, range'] },
      error: { type: 'string', example: 'Bad Request' }
    }
  }
})
@ApiInternalServerErrorResponse({ 
  description: 'Internal Server Error',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 500 },
      message: { type: 'string', example: 'Internal server error' },
      error: { type: 'string', example: 'Internal Server Error' }
    }
  }
})
export class MetricsController {
  constructor(
    @Inject(SymbolsMetrics.IMetricsService)
    private readonly metricsService: IMetricsService,
  ) {}

  @Get('general')
  @ApiOperation({ 
    summary: 'Get general metrics',
    description: 'Retrieves general business metrics including active clients, total revenue, active vehicles, and monthly bookings with comparison to previous period'
  })
  @ApiQuery({ name: 'dateFilterType', required: false, enum: ['day', 'week', 'month', 'year', 'range'], description: 'Type of date filter to apply' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for range filter (ISO 8601 format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for range filter (ISO 8601 format)', example: '2024-12-31' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 1000 })
  @ApiQuery({ name: 'vehicleType', required: false, type: String, description: 'Filter by vehicle type/category' })
  @ApiQuery({ name: 'bookingStatus', required: false, type: String, description: 'Filter by booking status' })
  @ApiQuery({ name: 'clientType', required: false, enum: ['new', 'recurring'], description: 'Filter by client type' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location (for transfers)' })
  @ApiResponse({ 
    status: 200, 
    description: 'General metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        activeClients: {
          type: 'object',
          properties: {
            current: { type: 'number', example: 150 },
            previous: { type: 'number', example: 120 },
            percentageChange: { type: 'number', example: 25 },
            trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' }
          }
        },
        totalRevenue: {
          type: 'object',
          properties: {
            current: { type: 'number', example: 50000 },
            previous: { type: 'number', example: 45000 },
            percentageChange: { type: 'number', example: 11.11 },
            trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' }
          }
        },
        activeVehicles: {
          type: 'object',
          properties: {
            current: { type: 'number', example: 25 },
            previous: { type: 'number', example: 23 },
            percentageChange: { type: 'number', example: 8.7 },
            trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' }
          }
        },
        monthlyBookings: {
          type: 'object',
          properties: {
            current: { type: 'number', example: 200 },
            previous: { type: 'number', example: 180 },
            percentageChange: { type: 'number', example: 11.11 },
            trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' }
          }
        }
      }
    }
  })
  async getGeneralMetrics(@Query() filtersDto: MetricsFiltersDTO) {
    const filters = this.transformFilters(filtersDto);
    return await this.metricsService.getGeneralMetrics(filters);
  }

  @Get('category-revenue')
  @ApiOperation({ 
    summary: 'Get category revenue metrics',
    description: 'Retrieves revenue generated by each vehicle category'
  })
  @ApiQuery({ name: 'dateFilterType', required: false, enum: ['day', 'week', 'month', 'year', 'range'], description: 'Type of date filter to apply' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for range filter (ISO 8601 format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for range filter (ISO 8601 format)', example: '2024-12-31' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 1000 })
  @ApiQuery({ name: 'vehicleType', required: false, type: String, description: 'Filter by vehicle type/category' })
  @ApiQuery({ name: 'bookingStatus', required: false, type: String, description: 'Filter by booking status' })
  @ApiQuery({ name: 'clientType', required: false, enum: ['new', 'recurring'], description: 'Filter by client type' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location (for transfers)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Category revenue metrics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoryId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          categoryName: { type: 'string', example: 'Trucks' },
          revenue: { type: 'number', example: 25000 }
        }
      }
    }
  })
  async getCategoryRevenue(@Query() filtersDto: MetricsFiltersDTO) {
    const filters = this.transformFilters(filtersDto);
    return await this.metricsService.getCategoryRevenue(filters);
  }

  @Get('category-utilization')
  @ApiOperation({ 
    summary: 'Get category utilization metrics',
    description: 'Retrieves utilization percentage for each vehicle category including total bookings and available vehicles'
  })
  @ApiQuery({ name: 'dateFilterType', required: false, enum: ['day', 'week', 'month', 'year', 'range'], description: 'Type of date filter to apply' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for range filter (ISO 8601 format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for range filter (ISO 8601 format)', example: '2024-12-31' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 1000 })
  @ApiQuery({ name: 'vehicleType', required: false, type: String, description: 'Filter by vehicle type/category' })
  @ApiQuery({ name: 'bookingStatus', required: false, type: String, description: 'Filter by booking status' })
  @ApiQuery({ name: 'clientType', required: false, enum: ['new', 'recurring'], description: 'Filter by client type' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location (for transfers)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Category utilization metrics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoryId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          categoryName: { type: 'string', example: 'Trucks' },
          utilizationPercentage: { type: 'number', example: 75.5 },
          totalBookings: { type: 'number', example: 45 },
          totalAvailable: { type: 'number', example: 60 }
        }
      }
    }
  })
  async getCategoryUtilization(@Query() filtersDto: MetricsFiltersDTO) {
    const filters = this.transformFilters(filtersDto);
    return await this.metricsService.getCategoryUtilization(filters);
  }

  @Get('booking-durations')
  @ApiOperation({ 
    summary: 'Get booking duration metrics',
    description: 'Retrieves the 4 most common booking durations in hours with their occurrence count'
  })
  @ApiQuery({ name: 'dateFilterType', required: false, enum: ['day', 'week', 'month', 'year', 'range'], description: 'Type of date filter to apply' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for range filter (ISO 8601 format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for range filter (ISO 8601 format)', example: '2024-12-31' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 1000 })
  @ApiQuery({ name: 'vehicleType', required: false, type: String, description: 'Filter by vehicle type/category' })
  @ApiQuery({ name: 'bookingStatus', required: false, type: String, description: 'Filter by booking status' })
  @ApiQuery({ name: 'clientType', required: false, enum: ['new', 'recurring'], description: 'Filter by client type' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location (for transfers)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking duration metrics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          duration: { type: 'number', example: 24, description: 'Duration in hours' },
          count: { type: 'number', example: 15 }
        }
      },
      maxItems: 4
    }
  })
  async getBookingDurations(@Query() filtersDto: MetricsFiltersDTO) {
    const filters = this.transformFilters(filtersDto);
    return await this.metricsService.getBookingDurations(filters);
  }

  @Get('popular-vehicles')
  @ApiOperation({ 
    summary: 'Get popular vehicle metrics',
    description: 'Retrieves the most popular vehicles with their revenue and booking count data'
  })
  @ApiQuery({ name: 'dateFilterType', required: false, enum: ['day', 'week', 'month', 'year', 'range'], description: 'Type of date filter to apply' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for range filter (ISO 8601 format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for range filter (ISO 8601 format)', example: '2024-12-31' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 1000 })
  @ApiQuery({ name: 'vehicleType', required: false, type: String, description: 'Filter by vehicle type/category' })
  @ApiQuery({ name: 'bookingStatus', required: false, type: String, description: 'Filter by booking status' })
  @ApiQuery({ name: 'clientType', required: false, enum: ['new', 'recurring'], description: 'Filter by client type' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location (for transfers)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Popular vehicle metrics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          vehicleId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          tag: { type: 'string', example: 'TRK-001' },
          model: { type: 'string', example: 'Ford Transit' },
          categoryName: { type: 'string', example: 'Trucks' },
          revenue: { type: 'number', example: 15000 },
          bookingCount: { type: 'number', example: 25 }
        }
      }
    }
  })
  async getPopularVehicles(@Query() filtersDto: MetricsFiltersDTO) {
    const filters = this.transformFilters(filtersDto);
    return await this.metricsService.getPopularVehicles(filters);
  }

  private transformFilters(filtersDto: MetricsFiltersDTO): MetricsFilters {
    const filters: MetricsFilters = {};

    if (filtersDto.dateFilterType) {
      filters.dateFilter = {
        type: filtersDto.dateFilterType,
      };

      if (filtersDto.startDate) {
        filters.dateFilter.startDate = new Date(filtersDto.startDate);
      }

      if (filtersDto.endDate) {
        filters.dateFilter.endDate = new Date(filtersDto.endDate);
      }
    }

    if (filtersDto.minPrice !== undefined || filtersDto.maxPrice !== undefined) {
      filters.priceRange = {
        min: filtersDto.minPrice || 0,
        max: filtersDto.maxPrice || Number.MAX_VALUE,
      };
    }

    if (filtersDto.vehicleType) {
      filters.vehicleType = filtersDto.vehicleType;
    }

    if (filtersDto.bookingStatus) {
      filters.bookingStatus = filtersDto.bookingStatus;
    }

    if (filtersDto.clientType) {
      filters.clientType = filtersDto.clientType;
    }

    if (filtersDto.location) {
      filters.location = filtersDto.location;
    }

    return filters;
  }
}