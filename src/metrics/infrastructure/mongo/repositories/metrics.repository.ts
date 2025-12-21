import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Model } from 'mongoose';
import { CatCategory } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-category.schema';
import { CatStatus } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-status.schema';
import { Booking } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { Cart } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import { Movement } from '../../../../core/infrastructure/mongo/schemas/public/movement.schema';
import { User } from '../../../../core/infrastructure/mongo/schemas/public/user.schema';
import { Vehicle } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';
import { IMetricsRepository } from '../../../domain/repositories/metrics.interface.repository';
import {
  BookingDuration,
  CategoryRevenue,
  CategoryUtilization,
  GeneralMetrics,
  MetricComparison,
  MetricsFilters,
  PaymentMethodRevenue,
  PopularVehicle,
  TransactionDetail,
  VehicleExpenses,
} from '../../../domain/types/metrics.type';
import { BOOKING_STATUS, EXCLUDED_BOOKING_STATUSES } from '../../nest/constants/booking-status.constants';

@Injectable()
export class MetricsRepository implements IMetricsRepository {
  private readonly logger = new Logger(MetricsRepository.name);
  
  // Cache para optimizar consultas frecuentes
  private statusCache: Map<string, any[]> = new Map();
  private vehicleCache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Vehicle') private readonly vehicleModel: Model<Vehicle>,
    @InjectModel('Booking') private readonly bookingModel: Model<Booking>,
    @InjectModel('Movement') private readonly movementModel: Model<Movement>,
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('CatCategory') private readonly categoryModel: Model<CatCategory>,
    @InjectModel('CatStatus') private readonly statusModel: Model<CatStatus>,
  ) { }

  /**
   * Obtiene los IDs de status APPROVED y COMPLETED con cache
   */
  private async getApprovedStatusIds(): Promise<any[]> {
    const cacheKey = 'APPROVED_COMPLETED_IDS';
    
    if (this.statusCache.has(cacheKey)) {
      return this.statusCache.get(cacheKey);
    }

    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED }).lean();
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED }).lean();
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);
    
    this.statusCache.set(cacheKey, statusIds);
    
    setTimeout(() => {
      this.statusCache.delete(cacheKey);
      this.logger.debug('[Cache] Status IDs cache invalidado');
    }, this.CACHE_TTL);
    
    return statusIds;
  }

  /**
   * Obtiene múltiples vehículos de una vez con cache
   */
  private async getVehiclesBatch(vehicleIds: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    const idsToFetch: string[] = [];

    // Verificar cache primero
    for (const id of vehicleIds) {
      if (this.vehicleCache.has(id)) {
        result.set(id, this.vehicleCache.get(id));
      } else {
        idsToFetch.push(id);
      }
    }

    // Fetch los que no están en cache
    if (idsToFetch.length > 0) {
      const vehicles = await this.vehicleModel
        .find({ _id: { $in: idsToFetch } })
        .populate('category')
        .lean();

      for (const vehicle of vehicles) {
        const id = vehicle._id.toString();
        this.vehicleCache.set(id, vehicle);
        result.set(id, vehicle);

        // Invalidar cache después del TTL
        setTimeout(() => {
          this.vehicleCache.delete(id);
        }, this.CACHE_TTL);
      }
    }

    return result;
  }

  /**
   * Agrega filtros para excluir bookings cancelados y rechazados
   * Estos estados no deben contabilizarse en reportes ni movimientos
   */
  private async addExcludedStatusFilter(filter: any): Promise<void> {
    const excludedStatuses = await this.statusModel.find({
      name: { $in: EXCLUDED_BOOKING_STATUSES }
    }).select('_id');

    if (excludedStatuses.length > 0) {
      const excludedIds = excludedStatuses.map(s => s._id);
      filter.status = { $nin: excludedIds };
    }
  }

  async getGeneralMetrics(filters?: MetricsFilters): Promise<GeneralMetrics> {
    const currentDateFilter = this.buildDateFilter(filters?.dateFilter);
    const previousDateFilter = this.buildPreviousDateFilter(filters?.dateFilter);

    // Obtener métricas actuales y anteriores
    const currentMetrics = await this.getMetricsForPeriod(filters, currentDateFilter);
    const previousMetrics = await this.getMetricsForPeriod(filters, previousDateFilter);

    return {
      activeClients: this.buildComparison(currentMetrics.activeClients, previousMetrics.activeClients),
      totalRevenue: this.buildComparison(currentMetrics.totalIncome, previousMetrics.totalIncome),
      totalExpenses: this.buildComparison(currentMetrics.totalExpenses, previousMetrics.totalExpenses),
      activeVehicles: this.buildComparison(currentMetrics.activeVehicles, previousMetrics.activeVehicles),
      monthlyBookings: this.buildComparison(currentMetrics.monthlyBookings, previousMetrics.monthlyBookings),
    };
  }

  async getVehicleFinancialDetails(vehicleId: string, filters?: MetricsFilters): Promise<TransactionDetail[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);

    this.logger.log(`[getVehicleFinancialDetails] Calculando detalles financieros para vehículo: ${vehicleId}`);

    // --- 1. OBTENER LOS EGRESOS (MOVEMENTS) ASOCIADOS AL VEHÍCULO ---
    const expenseMatch: any = {
      direction: 'OUT',
      vehicle: new mongoose.Types.ObjectId(vehicleId)
    };
    if (dateFilter) {
      expenseMatch.date = dateFilter;
    }

    const expensePipeline = [
      { $match: expenseMatch },
      {
        $project: {
          _id: 0,
          type: { $literal: 'EXPENSE' },
          date: '$date',
          amount: '$amount',
          description: '$detail',
          sourceId: '$_id'
        }
      }
    ];
    const expenseDetails = await this.movementModel.aggregate(expensePipeline);

    // --- 2. OBTENER LOS INGRESOS (BOOKINGS) DONDE PARTICIPÓ EL VEHÍCULO ---
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    if (statusIds.length === 0) {
      this.logger.warn(`[getVehicleFinancialDetails] No se encontraron estados APPROVED o COMPLETED`);
      return [...expenseDetails];
    }

    // Obtener TODAS las reservas APROBADAS/COMPLETADAS y filtrar en memoria
    const incomeMatch: any = {
      status: { $in: statusIds }
    };

    const bookings: HydratedDocument<Booking>[] = await this.bookingModel.find(incomeMatch);
    const incomeDetails: TransactionDetail[] = [];
    let processedBookings = 0;
    let skippedBookings = 0;

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        const payments = (booking as any).payments || [];
        
        // Verificar si el vehículo está realmente en el carrito
        let vehicleFoundInCart = false;
        
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            const vehicleInCartId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
            if (vehicleInCartId === vehicleId) {
              vehicleFoundInCart = true;
              break;
            }
          }
        }

        // Si el vehículo no está en el carrito, saltar esta reserva
        if (!vehicleFoundInCart) {
          skippedBookings++;
          continue;
        }

        processedBookings++;
        
        // Calcular el total del carrito para prorratear
        let cartTotal = 0;
        
        // Sumar todos los items del carrito
        if (cart.vehicles) {
          cartTotal += cart.vehicles.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
        }
        if (cart.tours) {
          cartTotal += cart.tours.reduce((sum: number, t: any) => sum + ((t.tour?.price || 0) * (t.quantity || 1)), 0);
        }
        if (cart.transfer) {
          cartTotal += cart.transfer.reduce((sum: number, t: any) => sum + ((t.transfer?.price || 0) * (t.quantity || 1)), 0);
        }
        if (cart.tickets) {
          cartTotal += cart.tickets.reduce((sum: number, t: any) => sum + ((t.ticket?.totalPrice || 0) * (t.quantity || 1)), 0);
        }

        for (const vehicleItem of cart.vehicles) {
          const vehicleInCartId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
          if (vehicleInCartId === vehicleId) {
            const vehicleItemTotal = vehicleItem.total || 0;
            
            // Procesar cada pago individualmente
            for (const payment of payments) {
              if (payment.status === 'PAID') {
                // Filtrar por fecha si existe
                if (dateFilter) {
                  const paymentDate = new Date(payment.paymentDate);
                  if (paymentDate < dateFilter.$gte || paymentDate >= dateFilter.$lt) {
                    continue;
                  }
                }

                // Prorratear el pago según la proporción del vehículo
                const proratedAmount = cartTotal > 0 
                  ? (vehicleItemTotal / cartTotal) * payment.amount 
                  : payment.amount;

                this.logger.debug(`[getVehicleFinancialDetails] Booking #${booking.bookingNumber}, Pago ${payment.paymentType}: ` +
                  `vehicleTotal=${vehicleItemTotal}, cartTotal=${cartTotal}, paymentAmount=${payment.amount}, ` +
                  `proratedAmount=${proratedAmount.toFixed(2)}`);

                incomeDetails.push({
                  type: 'INCOME',
                  date: payment.paymentDate,
                  amount: Math.round(proratedAmount * 100) / 100,
                  description: `${payment.notes || 'Pago'} - Reserva #${booking.bookingNumber}`,
                  sourceId: booking._id.toString(),
                });
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Error al procesar el carrito del booking ${booking._id}:`, error);
      }
    }

    this.logger.log(`[getVehicleFinancialDetails] Procesadas ${processedBookings} reservas con el vehículo, omitidas ${skippedBookings} sin el vehículo`);

    // --- 3. COMBINAR Y ORDENAR LOS RESULTADOS ---
    const combinedTransactions = [...incomeDetails, ...expenseDetails];
    combinedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIncome = incomeDetails.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseDetails.reduce((sum, t) => sum + t.amount, 0);
    this.logger.log(`[getVehicleFinancialDetails] Vehículo ${vehicleId}: ` +
      `Ingresos=${totalIncome.toFixed(2)}, Gastos=${totalExpenses.toFixed(2)}, ` +
      `Neto=${(totalIncome - totalExpenses).toFixed(2)}`);

    return combinedTransactions;
  }

  private async getMetricsForPeriod(filters?: MetricsFilters, dateFilter?: any): Promise<{
    activeClients: number;
    totalIncome: number;
    totalExpenses: number;
    activeVehicles: number;
    monthlyBookings: number;
  }> {
    // Obtener IDs de status APROBADAS y COMPLETADAS
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    // Contar clientes activos que tienen al menos una reserva APROBADA en el período
    let activeClients: number;
    
    const clientPipeline: any[] = [
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
    totalBookingsCount: { $size: '$userBookings' },
    approvedBookings: {
    $filter: {
    input: '$userBookings',
    as: 'booking',
    cond: {
    $and: [
    { $in: ['$$booking.status', statusIds] },
    ...(dateFilter ? [{ 
    $gte: ['$$booking.createdAt', dateFilter.$gte] 
    }, {
    $lt: ['$$booking.createdAt', dateFilter.$lt]
    }] : [])
    ]
    }
    }
    }
    }
    },
    {
    $addFields: {
    approvedBookingCount: { $size: '$approvedBookings' }
    }
    },
    {
    $match: {
    approvedBookingCount: { $gt: 0 }
    }
    }
    ];
    
    if (filters?.clientType) {
      clientPipeline.push({
        $match: filters.clientType === 'new'
          ? { approvedBookingCount: { $lt: 3 } }
          : { approvedBookingCount: { $gte: 3 } }
      });
    }

    clientPipeline.push({ $count: 'total' });

    const clientResult = await this.userModel.aggregate(clientPipeline);
    activeClients = clientResult.length > 0 ? clientResult[0].total : 0;

    // Calcular ingresos usando payments.paymentDate
    if (statusIds.length === 0) {
      this.logger.warn(`[getMetricsForPeriod] Status '${BOOKING_STATUS.APPROVED}' o '${BOOKING_STATUS.COMPLETED}' no encontrados`);
    }

    const incomePipeline: any[] = [
      { $match: { status: { $in: statusIds } } },
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      { 
        $match: { 
          'payments.status': 'PAID',
          ...(dateFilter && { 'payments.paymentDate': dateFilter })
        } 
      }
    ];

    if (filters?.priceRange) {
      incomePipeline.push({
        $match: {
          'payments.amount': {
            $gte: filters.priceRange.min,
            $lte: filters.priceRange.max
          }
        }
      });
    }

    incomePipeline.push({ $group: { _id: null, total: { $sum: '$payments.amount' } } });

    const totalIncomeResult = await this.bookingModel.aggregate(incomePipeline);
    const totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;

    const expenseFilter: any = { direction: 'OUT' };
    if (dateFilter) {
      expenseFilter.date = dateFilter; // CORRECCIÓN: usar 'date' en lugar de 'createdAt' para movements
    }

    const totalExpensesResult = await this.movementModel.aggregate([
      { $match: expenseFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;

    let vehicleFilter: any = { isActive: true };
    if (filters?.vehicleType) {
      const category = await this.categoryModel.findOne({ name: filters.vehicleType });
      if (category) {
        vehicleFilter.category = category._id;
      }
    }
    const activeVehicles = await this.vehicleModel.countDocuments(vehicleFilter);

    // Contar reservas APROBADAS/COMPLETADAS creadas en el período
    const bookingFilter: any = {
      status: { $in: statusIds }
    };
    
    if (dateFilter) {
      bookingFilter.createdAt = dateFilter;
    }
    
    const monthlyBookings = await this.bookingModel.countDocuments(bookingFilter);

    return {
      activeClients,
      totalIncome,
      totalExpenses,
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
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    // Obtener bookings con pagos en el rango de fechas
    const bookingsPipeline: any[] = [
      { $match: { status: { $in: statusIds } } },
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      { 
        $match: { 
          'payments.status': 'PAID',
          ...(dateFilter && { 'payments.paymentDate': dateFilter })
        } 
      }
    ];

    if (filters?.priceRange) {
      bookingsPipeline.push({
        $match: {
          'payments.amount': {
            $gte: filters.priceRange.min,
            $lte: filters.priceRange.max
          }
        }
      });
    }

    bookingsPipeline.push({
      $group: {
        _id: '$_id',
        cart: { $first: '$cart' },
        totalPaidInPeriod: { $sum: '$payments.amount' },
        bookingTotal: { $first: '$total' }
      }
    });

    const bookingsWithPayments = await this.bookingModel.aggregate(bookingsPipeline);
    const revenues = new Map<string, { categoryId: string; categoryName: string; revenue: number }>();

    for (const bookingData of bookingsWithPayments) {
      const booking = { cart: bookingData.cart, total: bookingData.bookingTotal };
      const totalPaidInPeriod = bookingData.totalPaidInPeriod;
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
                  // Prorratear el pago según la proporción del vehículo
                  const vehicleRevenue = (vehicleItem.total / booking.total) * totalPaidInPeriod;
                  
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += vehicleRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: vehicleRevenue
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
                  // Prorratear el pago según la proporción del tour
                  const tourRevenue = (totalTourRevenue / booking.total) * totalPaidInPeriod;
                  
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += tourRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: tourRevenue
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
                  // Prorratear el pago según la proporción del transfer
                  const transferRevenue = (totalTransferRevenue / booking.total) * totalPaidInPeriod;
                  
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += transferRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: transferRevenue
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
                  // Prorratear el pago según la proporción del ticket
                  const ticketRevenue = (totalTicketRevenue / booking.total) * totalPaidInPeriod;
                  
                  const existing = revenues.get(categoryId);
                  if (existing) {
                    existing.revenue += ticketRevenue;
                  } else {
                    revenues.set(categoryId, {
                      categoryId,
                      categoryName,
                      revenue: ticketRevenue
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Invalid cart JSON in booking:', bookingData._id);
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

  async getPaymentMethodRevenue(): Promise<PaymentMethodRevenue[]> {
    // Es buena práctica asegurarse de que el ingreso proviene de reservas finalizadas.
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED }).select('_id');
    if (!completedStatus) {
      this.logger.warn(`[getPaymentMethodRevenue] Estado '${BOOKING_STATUS.APPROVED}' no encontrado, el resultado puede ser impreciso.`);
      return [];
    }

    const aggregationPipeline: any[] = [
      {
        // Paso 1: Filtrar solo los documentos relevantes.
        $match: {
          status: completedStatus._id, // Solo reservas completadas.
          totalPaid: { $exists: true, $gt: 0 },
          paymentMethod: { $ne: null }
        }
      },
      {
        // Paso 2: Agrupar por el campo 'paymentMethod' y sumar 'totalPaid'.
        $group: {
          _id: '$paymentMethod', // Agrupa por el ObjectId del método de pago.
          revenue: { $sum: '$totalPaid' } // Suma el total pagado para cada grupo.
        }
      },
      {
        // Paso 3: Unir con la colección de métodos de pago para obtener el nombre.
        $lookup: {
          from: 'cat_payment_method', // El nombre de la colección de métodos de pago.
          localField: '_id',
          foreignField: '_id',
          as: 'paymentMethodInfo'
        }
      },
      {
        // Paso 4: Descomprimir el array resultado del $lookup.
        $unwind: {
          path: '$paymentMethodInfo',
          preserveNullAndEmptyArrays: true // Mantener registros aunque el método de pago no se encuentre.
        }
      },
      {
        // Paso 5: Formatear la salida final.
        $project: {
          _id: 0, // No incluir el campo _id.
          paymentMethodId: '$_id',
          paymentMethodName: { $ifNull: ['$paymentMethodInfo.name', 'No especificado'] }, // Usar el nombre o un texto por defecto.
          revenue: '$revenue'
        }
      },
      {
        // Paso 6: Ordenar los resultados por los ingresos de mayor a menor.
        $sort: {
          revenue: -1
        }
      }
    ];

    const result = await this.bookingModel.aggregate<PaymentMethodRevenue>(aggregationPipeline);

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
    // Solo considerar reservas APROBADAS
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    const bookingFilter: any = {
      status: { $in: statusIds }
    };
    if (dateFilter) {
      bookingFilter.createdAt = dateFilter;
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
    
    // Solo considerar reservas APROBADAS
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    const matchStage: any = {
      status: { $in: statusIds }
    };

    if (dateFilter) {
      matchStage.createdAt = dateFilter;
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
    const startTime = Date.now();
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    
    // ✅ Usar cache para status IDs
    const statusIds = await this.getApprovedStatusIds();

    const matchStage: any = {
      status: { $in: statusIds }
    };

    if (dateFilter) {
      matchStage.createdAt = dateFilter;
    }

    if (filters?.priceRange) {
      matchStage.total = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    // ✅ Usar .lean() para mejor rendimiento
    const bookings = await this.bookingModel.find(matchStage).select('cart').lean();
    
    // ✅ Primero recolectar todos los IDs de vehículos
    const vehicleIds = new Set<string>();
    const vehicleRevenueMap = new Map<string, { revenue: number; bookingCount: number }>();

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.vehicle && vehicleItem.total) {
              const vehicleId = vehicleItem.vehicle._id?.toString() || vehicleItem.vehicle.toString();
              vehicleIds.add(vehicleId);

              const existing = vehicleRevenueMap.get(vehicleId);
              if (existing) {
                existing.revenue += vehicleItem.total;
                existing.bookingCount += 1;
              } else {
                vehicleRevenueMap.set(vehicleId, {
                  revenue: vehicleItem.total,
                  bookingCount: 1
                });
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn('Invalid cart JSON in booking:', booking._id);
      }
    }

    // ✅ UNA SOLA consulta para obtener todos los vehículos
    const vehiclesMap = await this.getVehiclesBatch(Array.from(vehicleIds));

    // ✅ Construir resultado usando el Map
    const vehicleStats: PopularVehicle[] = [];

    for (const [vehicleId, stats] of vehicleRevenueMap.entries()) {
      const vehicle = vehiclesMap.get(vehicleId);
      
      if (vehicle && vehicle.category) {
        const category = vehicle.category as any;

        // Aplicar filtro de tipo de vehículo si existe
        if (filters?.vehicleType && category.name !== filters.vehicleType) {
          continue;
        }

        vehicleStats.push({
          vehicleId,
          name: vehicle.name,
          tag: vehicle.tag,
          categoryName: category.name,
          image: vehicle.images && vehicle.images.length > 0 ? vehicle.images[0] : undefined,
          revenue: stats.revenue,
          bookingCount: stats.bookingCount
        });
      }
    }

    // Aplicar ordenamiento
    if (filters?.sortBy && filters?.sortOrder) {
      vehicleStats.sort((a, b) => {
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
      vehicleStats.sort((a, b) => b.bookingCount - a.bookingCount || b.revenue - a.revenue);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`[getPopularVehicles] Completado en ${duration}ms - ${vehicleStats.length} vehículos`);

    return vehicleStats;
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

  async getTransactionDetails(filters?: MetricsFilters): Promise<{ data: TransactionDetail[]; total: number; page: number; limit: number; totalPages: number }> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    let combinedTransactions: TransactionDetail[] = [];

    // Parámetros de paginación
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    // Verificar si se debe incluir ingresos
    const includeIncome = !filters?.transactionType || filters.transactionType === 'INCOME';
    // Verificar si se debe incluir egresos
    const includeExpenses = !filters?.transactionType || filters.transactionType === 'EXPENSE';

    // --- 1. OBTENER LOS DETALLES DE INGRESOS (BOOKINGS) ---
    if (includeIncome) {
      const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
      const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
      
      const statusIds = [];
      if (approvedStatus) statusIds.push(approvedStatus._id);
      if (completedStatus) statusIds.push(completedStatus._id);

      if (statusIds.length === 0) {
        this.logger.warn(`[getTransactionDetails] Status '${BOOKING_STATUS.APPROVED}' o '${BOOKING_STATUS.COMPLETED}' no encontrados`);
      }

      const incomePipeline: any[] = [
        { $match: { status: { $in: statusIds } } },
        { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
        { 
          $match: { 
            'payments.status': 'PAID',
            ...(dateFilter && { 'payments.paymentDate': dateFilter })
          } 
        },
        {
          $project: {
            _id: 0,
            type: { $literal: 'INCOME' },
            date: '$payments.paymentDate',
            amount: '$payments.amount',
            description: { 
              $concat: [
                { $ifNull: ['$payments.notes', 'Pago'] },
                " - Reserva #",
                { $toString: "$bookingNumber" }
              ]
            },
            sourceId: { $toString: '$_id' },
            paymentType: '$payments.paymentType'
          }
        }
      ];
      const incomeDetails = await this.bookingModel.aggregate(incomePipeline);
      combinedTransactions.push(...incomeDetails);
    }

    // --- 2. OBTENER LOS DETALLES DE EGRESOS (MOVEMENTS) ---
    if (includeExpenses) {
      const expenseMatch: any = {
        direction: 'OUT'
      };
      if (dateFilter) {
        // Usamos 'date' para los movimientos, no 'createdAt'
        expenseMatch.date = dateFilter;
      }

      const expensePipeline = [
        { $match: expenseMatch },
        {
          $project: {
            _id: 0,
            type: { $literal: 'EXPENSE' },
            date: '$date',
            amount: '$amount',
            description: '$detail',
            sourceId: '$_id'
          }
        }
      ];
      const expenseDetails = await this.movementModel.aggregate(expensePipeline);
      combinedTransactions.push(...expenseDetails);
    }

    // --- 3. ORDENAR LOS RESULTADOS ---
    // Aplicar ordenamiento según los filtros
    if (filters?.sortBy === 'amount' && filters?.sortOrder) {
      // Ordenar por monto
      combinedTransactions.sort((a, b) => {
        return filters.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      });
    } else {
      // Ordenamiento por defecto: por fecha, del más reciente al más antiguo
      combinedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // --- 4. APLICAR PAGINACIÓN ---
    const total = combinedTransactions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = combinedTransactions.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getVehicleExpenses(filters?: MetricsFilters): Promise<VehicleExpenses[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);

    this.logger.log('[getVehicleExpenses] Obteniendo gastos por vehículo');

    // Pipeline de agregación para obtener gastos por vehículo
    const pipeline: any[] = [
      {
        $match: {
          direction: 'OUT',
          vehicle: { $exists: true, $ne: null },
          isDeleted: { $ne: true },
          ...(dateFilter && { date: dateFilter })
        }
      },
      {
        $group: {
          _id: '$vehicle',
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vehicle',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      {
        $unwind: {
          path: '$vehicleData',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: 'cat_category',
          localField: 'vehicleData.category',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      {
        $unwind: {
          path: '$categoryData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          vehicleId: { $toString: '$_id' },
          vehicleName: '$vehicleData.name',
          vehicleTag: '$vehicleData.tag',
          categoryName: { $ifNull: ['$categoryData.name', 'Sin categoría'] },
          totalExpenses: 1,
          expenseCount: 1
        }
      }
    ];

    const result = await this.movementModel.aggregate<VehicleExpenses>(pipeline);

    // Aplicar ordenamiento
    if (filters?.sortBy && filters?.sortOrder) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (filters.sortBy) {
          case 'expenses':
            comparison = a.totalExpenses - b.totalExpenses;
            break;
          case 'vehicleName':
            comparison = a.vehicleName.localeCompare(b.vehicleName);
            break;
          case 'count':
            comparison = a.expenseCount - b.expenseCount;
            break;
          case 'categoryName':
            comparison = a.categoryName.localeCompare(b.categoryName);
            break;
          default:
            comparison = a.totalExpenses - b.totalExpenses;
        }

        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Ordenamiento por defecto: por totalExpenses descendente
      result.sort((a, b) => b.totalExpenses - a.totalExpenses);
    }

    this.logger.log(`[getVehicleExpenses] Se encontraron ${result.length} vehículos con gastos`);

    return result;
  }
}