import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IMetricsRepository } from '../../../domain/repositories/metrics.interface.repository';
import {
  BookingDuration,
  CategoryRevenue,
  CategoryUtilization,
  GeneralMetrics,
  MetricsFilters,
  PopularVehicle,
  MetricComparison,
} from '../../../domain/types/metrics.type';
import { User } from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { Vehicle } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';
import { Booking } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { Cart } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import { CatCategory } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { CatStatus } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-status.schema';

@Injectable()
export class MetricsRepository implements IMetricsRepository {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Vehicle') private readonly vehicleModel: Model<Vehicle>,
    @InjectModel('Booking') private readonly bookingModel: Model<Booking>,
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('CatCategory') private readonly categoryModel: Model<CatCategory>,
    @InjectModel('CatStatus') private readonly statusModel: Model<CatStatus>,
  ) {}

  async getGeneralMetrics(filters?: MetricsFilters): Promise<GeneralMetrics> {
    const currentDateFilter = this.buildDateFilter(filters?.dateFilter);
    const previousDateFilter = this.buildPreviousDateFilter(filters?.dateFilter);
    
    // Obtener métricas actuales y anteriores
    const currentMetrics = await this.getMetricsForPeriod(filters, currentDateFilter);
    const previousMetrics = await this.getMetricsForPeriod(filters, previousDateFilter);

    return {
      activeClients: this.buildComparison(currentMetrics.activeClients, previousMetrics.activeClients),
      totalRevenue: this.buildComparison(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
      activeVehicles: this.buildComparison(currentMetrics.activeVehicles, previousMetrics.activeVehicles),
      monthlyBookings: this.buildComparison(currentMetrics.monthlyBookings, previousMetrics.monthlyBookings),
    };
  }

  private async getMetricsForPeriod(filters?: MetricsFilters, dateFilter?: any): Promise<{
    activeClients: number;
    totalRevenue: number;
    activeVehicles: number;
    monthlyBookings: number;
  }> {
    // Clientes activos - aplicar filtro de tipo de cliente si existe
    let activeClients: number;
    
    if (filters?.clientType) {
      // Obtener usuarios con conteo de reservas
      const userBookingCounts = await this.userModel.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'booking',
            localField: 'bookings',
            foreignField: '_id',
            as: 'userBookings'
          }
        },
        {
          $addFields: {
            bookingCount: { $size: '$userBookings' }
          }
        },
        {
          $match: filters.clientType === 'new' 
            ? { bookingCount: { $lt: 3 } }
            : { bookingCount: { $gte: 3 } }
        },
        { $count: 'total' }
      ]);

      activeClients = userBookingCounts.length > 0 ? userBookingCounts[0].total : 0;
    } else {
      activeClients = await this.userModel.countDocuments({ isActive: true });
    }

    // Ingresos totales de reservas completas
    const completedStatus = await this.statusModel.findOne({ name: 'completed' });
    const bookingFilter: any = {};
    
    if (completedStatus) {
      bookingFilter.status = completedStatus._id;
    }

    if (dateFilter) {
      bookingFilter.createdAt = dateFilter;
    }

    // Aplicar filtros adicionales
    if (filters?.priceRange) {
      bookingFilter.total = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    if (filters?.bookingStatus) {
      const statusObj = await this.statusModel.findOne({ name: filters.bookingStatus });
      if (statusObj) {
        bookingFilter.status = statusObj._id;
      }
    }

    const totalRevenueResult = await this.bookingModel.aggregate([
      { $match: bookingFilter },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    // Vehículos activos
    let vehicleFilter: any = { isActive: true };
    
    if (filters?.vehicleType) {
      const category = await this.categoryModel.findOne({ name: filters.vehicleType });
      if (category) {
        vehicleFilter.category = category._id;
      }
    }

    const activeVehicles = await this.vehicleModel.countDocuments(vehicleFilter);

    // Reservas del período (reservas que tienen fechas en el rango especificado)
    let monthlyBookings = 0;
    
    if (dateFilter) {
      // Para reservas del período, necesitamos parsear el cart JSON y verificar las fechas
      const bookings = await this.bookingModel.find({}).select('cart');
      
      for (const booking of bookings) {
        try {
          const cart = JSON.parse(booking.cart);
          let hasDateInRange = false;
          
          // Verificar fechas en vehicles
          if (cart.vehicles && Array.isArray(cart.vehicles)) {
            for (const vehicle of cart.vehicles) {
              if (vehicle.dates && vehicle.dates.start && vehicle.dates.end) {
                const startDate = new Date(vehicle.dates.start);
                const endDate = new Date(vehicle.dates.end);
                if (this.isDateInRange(startDate, dateFilter) || this.isDateInRange(endDate, dateFilter)) {
                  hasDateInRange = true;
                  break;
                }
              }
            }
          }
          
          // Verificar fechas en transfer
          if (!hasDateInRange && cart.transfer && Array.isArray(cart.transfer)) {
            for (const transfer of cart.transfer) {
              if (transfer.date) {
                const transferDate = new Date(transfer.date);
                if (this.isDateInRange(transferDate, dateFilter)) {
                  hasDateInRange = true;
                  break;
                }
              }
            }
          }
          
          // Verificar fechas en tours
          if (!hasDateInRange && cart.tours && Array.isArray(cart.tours)) {
            for (const tour of cart.tours) {
              if (tour.date) {
                const tourDate = new Date(tour.date);
                if (this.isDateInRange(tourDate, dateFilter)) {
                  hasDateInRange = true;
                  break;
                }
              }
            }
          }
          
          // Verificar fechas en tickets
          if (!hasDateInRange && cart.tickets && Array.isArray(cart.tickets)) {
            for (const ticket of cart.tickets) {
              if (ticket.date) {
                const ticketDate = new Date(ticket.date);
                if (this.isDateInRange(ticketDate, dateFilter)) {
                  hasDateInRange = true;
                  break;
                }
              }
            }
          }
          
          if (hasDateInRange) {
            monthlyBookings++;
          }
        } catch (error) {
          // Ignorar bookings con cart JSON inválido
          console.warn('Invalid cart JSON in booking:', booking._id);
        }
      }
    } else {
      monthlyBookings = await this.bookingModel.countDocuments({});
    }

    return {
      activeClients,
      totalRevenue,
      activeVehicles,
      monthlyBookings,
    };
  }

  private buildComparison(current: number, previous: number): MetricComparison {
    const percentageChange = previous === 0 ? 
      (current > 0 ? 100 : 0) : 
      ((current - previous) / previous) * 100;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(percentageChange) < 1) {
      trend = 'stable';
    } else if (percentageChange > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      current,
      previous,
      percentageChange: Math.round(percentageChange * 100) / 100,
      trend
    };
  }

  private buildPreviousDateFilter(dateFilter?: { type: string; startDate?: Date; endDate?: Date }) {
    if (!dateFilter) {
      // Por defecto comparar con el mes anterior
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return { $gte: start, $lt: end };
    }

    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateFilter.type) {
      case 'day':
        // Día anterior
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        // Semana anterior
        const dayOfWeek = now.getDay();
        const currentWeekStart = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        currentWeekStart.setHours(0, 0, 0, 0);
        start = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = new Date(currentWeekStart.getTime());
        break;
      case 'month':
        // Mes anterior
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        // Año anterior
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear(), 0, 1);
        break;
      case 'range':
        if (dateFilter.startDate && dateFilter.endDate) {
          const currentStart = dateFilter.startDate;
          const currentEnd = dateFilter.endDate;
          const duration = currentEnd.getTime() - currentStart.getTime();
          
          // Período anterior del mismo tamaño
          end = new Date(currentStart.getTime());
          start = new Date(currentStart.getTime() - duration);
        } else {
          // Fallback al mes anterior
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      default:
        // Fallback al mes anterior
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { $gte: start, $lt: end };
  }

  async getCategoryRevenue(filters?: MetricsFilters): Promise<CategoryRevenue[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    const completedStatus = await this.statusModel.findOne({ name: 'completed' });
    
    const matchStage: any = {};
    if (completedStatus) {
      matchStage.status = completedStatus._id;
    }
    if (dateFilter) {
      matchStage.createdAt = dateFilter;
    }

    // Aplicar filtros adicionales
    if (filters?.priceRange) {
      matchStage.total = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    if (filters?.bookingStatus) {
      const statusObj = await this.statusModel.findOne({ name: filters.bookingStatus });
      if (statusObj) {
        matchStage.status = statusObj._id;
      }
    }

    // Como el cart es un string JSON, necesitamos procesarlo diferente
    const bookings = await this.bookingModel.find(matchStage).select('cart total');
    const revenues = new Map<string, { categoryId: string; categoryName: string; revenue: number }>();

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        
        // Procesar vehicles
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.vehicle && vehicleItem.total) {
              const vehicle = await this.vehicleModel.findById(vehicleItem.vehicle).populate('category');
              if (vehicle && vehicle.category) {
                const category = vehicle.category as any; // Cast para acceder a _id
                const categoryId = category._id.toString();
                const categoryName = category.name;
                
                // Aplicar filtro de tipo de vehículo si existe
                if (!filters?.vehicleType || categoryName === filters.vehicleType) {
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += vehicleItem.total;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: vehicleItem.total
                    });
                  }
                }
              }
            }
          }
        }

        // Procesar tours
        if (cart.tours && Array.isArray(cart.tours)) {
          for (const tourItem of cart.tours) {
            if (tourItem.tour && tourItem.quantity) {
              // Los tours tienen su propia categoría y precio
              const tourPrice = tourItem.tour.price || 0;
              const totalTourRevenue = tourPrice * tourItem.quantity;
              
              if (tourItem.tour.category) {
                const categoryId = tourItem.tour.category._id;
                const categoryName = tourItem.tour.category.name;
                
                // Aplicar filtro de tipo si existe
                if (!filters?.vehicleType || categoryName === filters.vehicleType) {
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += totalTourRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: totalTourRevenue
                    });
                  }
                }
              }
            }
          }
        }

        // Procesar transfers
        if (cart.transfer && Array.isArray(cart.transfer)) {
          for (const transferItem of cart.transfer) {
            if (transferItem.transfer && transferItem.quantity) {
              const transferPrice = transferItem.transfer.price || 0;
              const totalTransferRevenue = transferPrice * transferItem.quantity;
              
              if (transferItem.transfer.category) {
                const categoryId = transferItem.transfer.category._id;
                const categoryName = transferItem.transfer.category.name;
                
                // Aplicar filtro de tipo si existe
                if (!filters?.vehicleType || categoryName === filters.vehicleType) {
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += totalTransferRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: totalTransferRevenue
                    });
                  }
                }
              }
            }
          }
        }

        // Procesar tickets
        if (cart.tickets && Array.isArray(cart.tickets)) {
          for (const ticketItem of cart.tickets) {
            if (ticketItem.ticket && ticketItem.quantity) {
              const ticketPrice = ticketItem.ticket.totalPrice || 0;
              const totalTicketRevenue = ticketPrice * ticketItem.quantity;
              
              if (ticketItem.ticket.category) {
                const categoryId = ticketItem.ticket.category._id;
                const categoryName = ticketItem.ticket.category.name;
                
                // Aplicar filtro de tipo si existe
                if (!filters?.vehicleType || categoryName === filters.vehicleType) {
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += totalTicketRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: totalTicketRevenue
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Invalid cart JSON in booking:', booking._id);
      }
    }

    const result = Array.from(revenues.values());
    
    // Aplicar ordenamiento
    if (filters?.sortBy && filters?.sortOrder) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'revenue':
            comparison = a.revenue - b.revenue;
            break;
          case 'categoryName':
            comparison = a.categoryName.localeCompare(b.categoryName);
            break;
          default:
            comparison = a.revenue - b.revenue;
        }
        
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Ordenamiento por defecto: por revenue descendente
      result.sort((a, b) => b.revenue - a.revenue);
    }
    
    return result;
  }

  async getCategoryUtilization(filters?: MetricsFilters): Promise<CategoryUtilization[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    
    // Obtener todas las categorías
    let categoryFilter: any = {};
    if (filters?.vehicleType) {
      categoryFilter.name = filters.vehicleType;
    }
    
    const categories = await this.categoryModel.find(categoryFilter);
    
    // Primero, contar el total de reservas para calcular porcentajes
    const bookingFilter: any = {};
    if (dateFilter) {
      bookingFilter.createdAt = dateFilter;
    }

    if (filters?.bookingStatus) {
      const statusObj = await this.statusModel.findOne({ name: filters.bookingStatus });
      if (statusObj) {
        bookingFilter.status = statusObj._id;
      }
    }

    const allBookings = await this.bookingModel.find(bookingFilter).select('cart');
    
    // Contar reservas por categoría y total general
    const categoryBookings = new Map<string, { categoryId: string; categoryName: string; count: number; totalVehicles: number }>();
    let totalBookingsCount = 0;

    // Inicializar todas las categorías con 0
    for (const category of categories) {
      const totalVehicles = await this.vehicleModel.countDocuments({ 
        category: category._id,
        isActive: true 
      });
      
      categoryBookings.set(category._id.toString(), {
        categoryId: category._id.toString(),
        categoryName: category.name,
        count: 0,
        totalVehicles
      });
    }

    // Contar reservas por categoría
    for (const booking of allBookings) {
      try {
        const cart = JSON.parse(booking.cart);
        
        // Procesar vehículos
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.vehicle) {
              const vehicle = await this.vehicleModel.findById(vehicleItem.vehicle);
              if (vehicle && vehicle.category) {
                const categoryId = (vehicle.category as any).toString();
                const categoryData = categoryBookings.get(categoryId);
                if (categoryData) {
                  categoryData.count++;
                  totalBookingsCount++;
                }
              }
            }
          }
        }

        // Procesar tours
        if (cart.tours && Array.isArray(cart.tours)) {
          for (const tourItem of cart.tours) {
            if (tourItem.tour && tourItem.tour.category) {
              const categoryId = tourItem.tour.category._id;
              const categoryData = categoryBookings.get(categoryId);
              if (categoryData) {
                const quantity = tourItem.quantity || 1;
                categoryData.count += quantity;
                totalBookingsCount += quantity;
              }
            }
          }
        }

        // Procesar transfers
        if (cart.transfer && Array.isArray(cart.transfer)) {
          for (const transferItem of cart.transfer) {
            if (transferItem.transfer && transferItem.transfer.category) {
              const categoryId = transferItem.transfer.category._id;
              const categoryData = categoryBookings.get(categoryId);
              if (categoryData) {
                const quantity = transferItem.quantity || 1;
                categoryData.count += quantity;
                totalBookingsCount += quantity;
              }
            }
          }
        }

        // Procesar tickets
        if (cart.tickets && Array.isArray(cart.tickets)) {
          for (const ticketItem of cart.tickets) {
            if (ticketItem.ticket && ticketItem.ticket.category) {
              const categoryId = ticketItem.ticket.category._id;
              const categoryData = categoryBookings.get(categoryId);
              if (categoryData) {
                const quantity = ticketItem.quantity || 1;
                categoryData.count += quantity;
                totalBookingsCount += quantity;
              }
            }
          }
        }
      } catch (error) {
        console.warn('Invalid cart JSON in booking:', booking._id);
      }
    }

    // Calcular porcentajes de distribución
    const utilizations: CategoryUtilization[] = [];
    
    for (const categoryData of categoryBookings.values()) {
      const utilizationPercentage = totalBookingsCount > 0 ? (categoryData.count / totalBookingsCount) * 100 : 0;
      
      utilizations.push({
        categoryId: categoryData.categoryId,
        categoryName: categoryData.categoryName,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        totalBookings: categoryData.count,
        totalAvailable: categoryData.totalVehicles
      });
    }

    // Aplicar ordenamiento
    if (filters?.sortBy && filters?.sortOrder) {
      utilizations.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'utilizationPercentage':
            comparison = a.utilizationPercentage - b.utilizationPercentage;
            break;
          case 'categoryName':
            comparison = a.categoryName.localeCompare(b.categoryName);
            break;
          case 'bookingCount':
            comparison = a.totalBookings - b.totalBookings;
            break;
          default:
            comparison = a.utilizationPercentage - b.utilizationPercentage;
        }
        
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Ordenamiento por defecto: por utilizationPercentage descendente
      utilizations.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
    }
    
    return utilizations;
  }

  async getBookingDurations(filters?: MetricsFilters): Promise<BookingDuration[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    const matchStage: any = {};
    
    if (dateFilter) {
      matchStage.createdAt = dateFilter;
    }

    if (filters?.bookingStatus) {
      const statusObj = await this.statusModel.findOne({ name: filters.bookingStatus });
      if (statusObj) {
        matchStage.status = statusObj._id;
      }
    }

    if (filters?.priceRange) {
      matchStage.total = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    const bookings = await this.bookingModel.find(matchStage).select('cart');
    const durations = new Map<number, number>();

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        
        // Procesar duraciones de vehículos (calculadas por fechas de inicio y fin)
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.dates && vehicleItem.dates.start && vehicleItem.dates.end) {
              // Aplicar filtro de tipo de vehículo si existe
              if (filters?.vehicleType) {
                const vehicle = await this.vehicleModel.findById(vehicleItem.vehicle).populate('category');
                if (!vehicle || (vehicle.category as any).name !== filters.vehicleType) {
                  continue;
                }
              }

              const startDate = new Date(vehicleItem.dates.start);
              const endDate = new Date(vehicleItem.dates.end);
              const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
              
              if (durationHours > 0) {
                const existing = durations.get(durationHours);
                durations.set(durationHours, (existing || 0) + 1);
              }
            }
          }
        }

        // Procesar duraciones de tours (duración fija estimada)
        if (cart.tours && Array.isArray(cart.tours)) {
          for (const tourItem of cart.tours) {
            if (tourItem.tour && tourItem.tour.estimatedDuration) {
              // Aplicar filtro de tipo si existe
              if (filters?.vehicleType) {
                const categoryName = tourItem.tour.category?.name;
                if (!categoryName || categoryName !== filters.vehicleType) {
                  continue;
                }
              }

              // Parsear la duración estimada (ej: "4 horas" -> 4)
              const durationText = tourItem.tour.estimatedDuration;
              const durationMatch = durationText.match(/(\d+)/);
              
              if (durationMatch) {
                const durationHours = parseInt(durationMatch[1]);
                const quantity = tourItem.quantity || 1;
                
                // Contar cada tour reservado
                for (let i = 0; i < quantity; i++) {
                  const existing = durations.get(durationHours);
                  durations.set(durationHours, (existing || 0) + 1);
                }
              }
            }
          }
        }

        // Procesar duraciones de transfers (duración fija estimada)
        if (cart.transfer && Array.isArray(cart.transfer)) {
          for (const transferItem of cart.transfer) {
            if (transferItem.transfer && transferItem.transfer.estimatedDuration) {
              // Aplicar filtro de tipo si existe
              if (filters?.vehicleType) {
                const categoryName = transferItem.transfer.category?.name;
                if (!categoryName || categoryName !== filters.vehicleType) {
                  continue;
                }
              }

              // Parsear la duración estimada (ej: "2 hs" -> 2)
              const durationText = transferItem.transfer.estimatedDuration;
              const durationMatch = durationText.match(/(\d+)/);
              
              if (durationMatch) {
                const durationHours = parseInt(durationMatch[1]);
                const quantity = transferItem.quantity || 1;
                
                // Contar cada transfer reservado
                for (let i = 0; i < quantity; i++) {
                  const existing = durations.get(durationHours);
                  durations.set(durationHours, (existing || 0) + 1);
                }
              }
            }
          }
        }

        // Los tickets generalmente no tienen duración, pero si la tuvieran:
        if (cart.tickets && Array.isArray(cart.tickets)) {
          for (const ticketItem of cart.tickets) {
            if (ticketItem.ticket && ticketItem.ticket.estimatedDuration) {
              // Aplicar filtro de tipo si existe
              if (filters?.vehicleType) {
                const categoryName = ticketItem.ticket.category?.name;
                if (!categoryName || categoryName !== filters.vehicleType) {
                  continue;
                }
              }

              // Parsear la duración estimada
              const durationText = ticketItem.ticket.estimatedDuration;
              const durationMatch = durationText.match(/(\d+)/);
              
              if (durationMatch) {
                const durationHours = parseInt(durationMatch[1]);
                const quantity = ticketItem.quantity || 1;
                
                // Contar cada ticket reservado
                for (let i = 0; i < quantity; i++) {
                  const existing = durations.get(durationHours);
                  durations.set(durationHours, (existing || 0) + 1);
                }
              }
            }
          }
        }

      } catch (error) {
        console.warn('Invalid cart JSON in booking:', booking._id);
      }
    }

    const result = Array.from(durations.entries())
      .map(([duration, count]) => ({ duration, count }));

    // Aplicar ordenamiento
    if (filters?.sortBy && filters?.sortOrder) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'duration':
            comparison = a.duration - b.duration;
            break;
          case 'count':
            comparison = a.count - b.count;
            break;
          default:
            comparison = a.count - b.count;
        }
        
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Ordenamiento por defecto: por count descendente
      result.sort((a, b) => b.count - a.count);
    }

    return result.slice(0, 4);
  }

  async getPopularVehicles(filters?: MetricsFilters): Promise<PopularVehicle[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    const matchStage: any = {};
    
    if (dateFilter) {
      matchStage.createdAt = dateFilter;
    }

    if (filters?.bookingStatus) {
      const statusObj = await this.statusModel.findOne({ name: filters.bookingStatus });
      if (statusObj) {
        matchStage.status = statusObj._id;
      }
    }

    if (filters?.priceRange) {
      matchStage.total = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    const bookings = await this.bookingModel.find(matchStage).select('cart');
    const vehicleStats = new Map<string, { 
      vehicleId: string; 
      name: string;
      tag: string; 
      categoryName: string; 
      image?: string;
      revenue: number; 
      bookingCount: number; 
    }>();

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.vehicle && vehicleItem.total) {
              const vehicle = await this.vehicleModel
                .findById(vehicleItem.vehicle)
                .populate('category');
              
              if (vehicle && vehicle.category) {
                const category = vehicle.category as any;
                
                // Aplicar filtro de tipo de vehículo si existe
                if (filters?.vehicleType && category.name !== filters.vehicleType) {
                  continue;
                }

                const vehicleId = vehicle._id.toString();
                const existing = vehicleStats.get(vehicleId);
                
                if (existing) {
                  existing.revenue += vehicleItem.total;
                  existing.bookingCount += 1;
                } else {
                  vehicleStats.set(vehicleId, {
                    vehicleId,
                    name: vehicle.name,
                    tag: vehicle.tag,
                    categoryName: category.name,
                    image: vehicle.images && vehicle.images.length > 0 ? vehicle.images[0] : undefined,
                    revenue: vehicleItem.total,
                    bookingCount: 1
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Invalid cart JSON in booking:', booking._id);
      }
    }

    const result = Array.from(vehicleStats.values());
    
    // Aplicar ordenamiento
    if (filters?.sortBy && filters?.sortOrder) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'revenue':
            comparison = a.revenue - b.revenue;
            break;
          case 'bookingCount':
            comparison = a.bookingCount - b.bookingCount;
            break;
          default:
            comparison = a.bookingCount - b.bookingCount;
        }
        
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Ordenamiento por defecto: por bookingCount descendente, luego por revenue descendente
      result.sort((a, b) => b.bookingCount - a.bookingCount || b.revenue - a.revenue);
    }
    
    return result;
  }

  private isDateInRange(date: Date, dateFilter: any): boolean {
    if (!dateFilter || !dateFilter.$gte || !dateFilter.$lt) {
      return false;
    }
    return date >= dateFilter.$gte && date < dateFilter.$lt;
  }

  private buildDateFilter(dateFilter?: { type: string; startDate?: Date; endDate?: Date }) {
    if (!dateFilter) {
      // Por defecto usar el mes actual
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { $gte: start, $lt: end };
    }

    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateFilter.type) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;
      case 'range':
        if (dateFilter.startDate && dateFilter.endDate) {
          start = dateFilter.startDate;
          end = dateFilter.endDate;
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    return { $gte: start, $lt: end };
  }
}