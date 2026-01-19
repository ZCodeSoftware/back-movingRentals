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

    // --- 2. OBTENER LOS INGRESOS (BOOKINGS Y EXTENSIONES) DONDE PARTICIPÓ EL VEHÍCULO ---
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    if (statusIds.length === 0) {
      this.logger.warn(`[getVehicleFinancialDetails] No se encontraron estados APPROVED o COMPLETED`);
      return [...expenseDetails];
    }

    // Obtener TODAS las reservas APROBADAS/COMPLETADAS
    const incomeMatch: any = {
      status: { $in: statusIds }
    };

    const bookings: HydratedDocument<Booking>[] = await this.bookingModel.find(incomeMatch).populate('paymentMethod');
    const incomeDetails: TransactionDetail[] = [];
    let processedBookings = 0;
    let skippedBookings = 0;

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        const payments = (booking as any).payments || [];
        
        // Verificar si el vehículo está realmente en el carrito
        let vehicleFoundInCart = false;
        let vehicleItemTotal = 0;
        
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            const vehicleInCartId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
            if (vehicleInCartId === vehicleId) {
              vehicleFoundInCart = true;
              vehicleItemTotal = vehicleItem.total || 0;
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

        // Procesar cada pago individualmente con las reglas de negocio específicas
        for (const payment of payments) {
          if (payment.status === 'PAID') {
            const paymentType = payment.paymentType?.toUpperCase() || 'OTHER';
            const paymentMethod = (booking.paymentMethod as any)?.name?.toUpperCase() || '';
            
            // Determinar la fecha según el tipo de pago
            let effectiveDate: Date;
            
            if (paymentType === 'CASH' || paymentMethod.includes('EFECTIVO')) {
              // EFECTIVO: 20% en fecha de carga (createdAt), 80% en fecha de aprobación (paymentDate)
              const createdAt = new Date((booking as any).createdAt);
              const paymentDate = new Date(payment.paymentDate);
              
              // Prorratear el pago según la proporción del vehículo
              const proratedAmount = cartTotal > 0 
                ? (vehicleItemTotal / cartTotal) * payment.amount 
                : payment.amount;
              
              const amount20 = proratedAmount * 0.20;
              const amount80 = proratedAmount * 0.80;
              
              // 20% en fecha de carga
              if (!dateFilter || this.isDateInRange(createdAt, dateFilter)) {
                incomeDetails.push({
                  type: 'INCOME',
                  date: createdAt,
                  amount: Math.round(amount20 * 100) / 100,
                  description: `Efectivo 20% - Reserva #${booking.bookingNumber}`,
                  sourceId: booking._id.toString(),
                });
              }
              
              // 80% en fecha de aprobación
              if (!dateFilter || this.isDateInRange(paymentDate, dateFilter)) {
                incomeDetails.push({
                  type: 'INCOME',
                  date: paymentDate,
                  amount: Math.round(amount80 * 100) / 100,
                  description: `Efectivo 80% - Reserva #${booking.bookingNumber}`,
                  sourceId: booking._id.toString(),
                });
              }
              
              continue;
            } else if (paymentType === 'TRANSFER' || paymentMethod.includes('TRANSFERENCIA')) {
              // TRANSFERENCIA: Fecha de aprobación (paymentDate)
              effectiveDate = new Date(payment.paymentDate);
            } else {
              // CRÉDITO/DÉBITO y OTROS: Fecha de carga (createdAt)
              effectiveDate = new Date((booking as any).createdAt);
            }
            
            // Filtrar por fecha si existe
            if (dateFilter && !this.isDateInRange(effectiveDate, dateFilter)) {
              continue;
            }

            // Prorratear el pago según la proporción del vehículo
            const proratedAmount = cartTotal > 0 
              ? (vehicleItemTotal / cartTotal) * payment.amount 
              : payment.amount;

            this.logger.debug(`[getVehicleFinancialDetails] Booking #${booking.bookingNumber}, Pago ${paymentType}: ` +
              `vehicleTotal=${vehicleItemTotal}, cartTotal=${cartTotal}, paymentAmount=${payment.amount}, ` +
              `proratedAmount=${proratedAmount.toFixed(2)}, effectiveDate=${effectiveDate.toISOString()}`);

            incomeDetails.push({
              type: 'INCOME',
              date: effectiveDate,
              amount: Math.round(proratedAmount * 100) / 100,
              description: `${payment.notes || 'Pago'} - Reserva #${booking.bookingNumber}`,
              sourceId: booking._id.toString(),
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Error al procesar el carrito del booking ${booking._id}:`, error);
      }
    }

    // --- 3. OBTENER EXTENSIONES DEL VEHÍCULO ---
    // Las extensiones se registran en ContractHistory con action: 'EXTENSION_UPDATED'
    const ContractModel = mongoose.model('Contract');
    const ContractHistoryModel = mongoose.model('ContractHistory');
    
    try {
      // Buscar contratos del vehículo
      const contracts = await ContractModel.find({ 
        vehicle: new mongoose.Types.ObjectId(vehicleId) 
      }).select('_id');
      
      const contractIds = contracts.map(c => c._id);
      
      if (contractIds.length > 0) {
        // Buscar extensiones en el historial de contratos
        const extensions = await ContractHistoryModel.find({
          contract: { $in: contractIds },
          action: 'EXTENSION_UPDATED',
          isDeleted: { $ne: true },
          'eventMetadata.amount': { $exists: true, $gt: 0 }
        }).lean();
        
        for (const extension of extensions) {
          const extensionDate = new Date((extension as any).createdAt);
          const extensionAmount = (extension as any).eventMetadata?.amount || 0;
          
          // Filtrar por fecha si existe
          if (dateFilter && !this.isDateInRange(extensionDate, dateFilter)) {
            continue;
          }
          
          // Las extensiones siempre cuentan en la fecha de carga (createdAt)
          incomeDetails.push({
            type: 'INCOME',
            date: extensionDate,
            amount: extensionAmount,
            description: `Extensión de Renta - Contrato`,
            sourceId: (extension as any)._id.toString(),
          });
          
          this.logger.debug(`[getVehicleFinancialDetails] Extensión encontrada: ` +
            `amount=${extensionAmount}, date=${extensionDate.toISOString()}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Error al procesar extensiones del vehículo ${vehicleId}:`, error);
    }

    this.logger.log(`[getVehicleFinancialDetails] Procesadas ${processedBookings} reservas con el vehículo, omitidas ${skippedBookings} sin el vehículo`);

    // --- 4. COMBINAR Y ORDENAR LOS RESULTADOS ---
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

    // Obtener ID de categoría si se filtra por vehicleType
    let categoryId: any = null;
    if (filters?.vehicleType) {
      const category = await this.categoryModel.findOne({ name: filters.vehicleType });
      if (category) {
        categoryId = category._id;
      }
    }

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
    totalBookingsCount: { $size: { $ifNull: ['$userBookings', []] } },
    approvedBookings: {
    $filter: {
    input: { $ifNull: ['$userBookings', []] },
    as: 'booking',
    cond: {
    $and: [
    { $in: ['$booking.status', statusIds] },
    ...(dateFilter ? [{ 
    $gte: ['$booking.createdAt', dateFilter.$gte] 
    }, {
    $lt: ['$booking.createdAt', dateFilter.$lt]
    }] : [])
    ]
    }
    }
    }
    }
    },
    {
    $addFields: {
    approvedBookingCount: { $size: { $ifNull: ['$approvedBookings', []] } }
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
    // Si hay filtro de vehicleType, necesitamos filtrar por bookings que contengan vehículos de esa categoría
    if (statusIds.length === 0) {
      this.logger.warn(`[getMetricsForPeriod] Status '${BOOKING_STATUS.APPROVED}' o '${BOOKING_STATUS.COMPLETED}' no encontrados`);
    }

    let totalIncome = 0;
    
    if (categoryId) {
      // Si hay filtro de categoría, obtener vehículos de esa categoría
      const vehiclesInCategory = await this.vehicleModel.find({ category: categoryId }).select('_id').lean();
      const vehicleIdsInCategory = vehiclesInCategory.map(v => v._id.toString());
      
      // Obtener bookings que contengan al menos un vehículo de la categoría filtrada
      const bookingsMatch: any = { status: { $in: statusIds } };
      const bookings = await this.bookingModel.find(bookingsMatch).lean();
      
      for (const booking of bookings) {
        try {
          const cart = JSON.parse(booking.cart);
          let hasVehicleInCategory = false;
          
          // Verificar si el booking tiene vehículos de la categoría filtrada
          if (cart.vehicles && Array.isArray(cart.vehicles)) {
            for (const vehicleItem of cart.vehicles) {
              const vehicleId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
              if (vehicleIdsInCategory.includes(vehicleId)) {
                hasVehicleInCategory = true;
                break;
              }
            }
          }
          
          // Si el booking tiene vehículos de la categoría, sumar sus pagos
          if (hasVehicleInCategory) {
            const payments = (booking as any).payments || [];
            for (const payment of payments) {
              if (payment.status === 'PAID') {
                // Aplicar filtro de fecha si existe
                if (dateFilter) {
                  const paymentDate = new Date(payment.paymentDate);
                  if (paymentDate >= dateFilter.$gte && paymentDate < dateFilter.$lt) {
                    totalIncome += payment.amount || 0;
                  }
                } else {
                  totalIncome += payment.amount || 0;
                }
              }
            }
          }
        } catch (error) {
          this.logger.warn(`[getMetricsForPeriod] Error parsing cart for booking ${booking._id}: ${error.message}`);
        }
      }
    } else {
      // Sin filtro de categoría, usar el pipeline original
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
      totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;
    }

    // Calcular gastos
    // Si hay filtro de categoría, solo contar gastos de vehículos de esa categoría
    let totalExpenses = 0;
    
    if (categoryId) {
      // Obtener vehículos de la categoría filtrada
      const vehiclesInCategory = await this.vehicleModel.find({ category: categoryId }).select('_id').lean();
      const vehicleIdsInCategory = vehiclesInCategory.map(v => v._id);
      
      const expenseFilter: any = {
        direction: 'OUT',
        isDeleted: { $ne: true },
        vehicle: { $in: vehicleIdsInCategory }
      };
      
      if (dateFilter) {
        expenseFilter.date = dateFilter;
      }
      
      const totalExpensesResult = await this.movementModel.aggregate([
        { $match: expenseFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;
    } else {
      // Sin filtro de categoría, contar todos los gastos
      const expenseFilter: any = {
        direction: 'OUT',
        isDeleted: { $ne: true }
      };
      if (dateFilter) {
        expenseFilter.date = dateFilter;
      }

      const totalExpensesResult = await this.movementModel.aggregate([
        { $match: expenseFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;
    }

    let vehicleFilter: any = { isActive: true };
    if (categoryId) {
      vehicleFilter.category = categoryId;
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
      case 'lastMonth':
        // Dos meses atrás (para comparar con el mes pasado)
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
    const statusIds = await this.getApprovedStatusIds();

    // Obtener bookings APROBADAS/COMPLETADAS creadas en el período
    const bookingsMatch: any = {
      status: { $in: statusIds },
      ...(dateFilter && { createdAt: dateFilter })
    };

    if (filters?.priceRange) {
      bookingsMatch.total = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }

    const bookings = await this.bookingModel.find(bookingsMatch).select('cart total').lean();
    
    const revenues = new Map<string, { categoryId: string; categoryName: string; revenue: number }>();

    // Recolectar todos los IDs de vehículos únicos primero
    const vehicleIds = new Set<string>();
    const vehicleRevenueTemp = new Map<string, number>();

    for (const bookingData of bookings) {
      try {
        const cart = JSON.parse(bookingData.cart);

        // Procesar vehicles - solo recolectar IDs y revenue
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.vehicle && vehicleItem.total) {
              const vehicleId = vehicleItem.vehicle._id?.toString() || vehicleItem.vehicle.toString();
              vehicleIds.add(vehicleId);
              
              const existing = vehicleRevenueTemp.get(vehicleId);
              vehicleRevenueTemp.set(vehicleId, (existing || 0) + vehicleItem.total);
            }
          }
        }

        // Procesar tours
        if (cart.tours && Array.isArray(cart.tours)) {
          for (const tourItem of cart.tours) {
            if (tourItem.tour && tourItem.quantity) {
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
        // Ignorar errores de parsing de carrito
      }
    }

    // Obtener todos los vehículos en UNA SOLA consulta batch
    if (vehicleIds.size > 0) {
      const vehiclesMap = await this.getVehiclesBatch(Array.from(vehicleIds));

      // Procesar revenue de vehículos usando el Map
      for (const [vehicleId, revenue] of vehicleRevenueTemp.entries()) {
        const vehicle = vehiclesMap.get(vehicleId);
        
        if (vehicle && vehicle.category) {
          const category = vehicle.category as any;
          const categoryId = category._id.toString();
          const categoryName = category.name;

          // Aplicar filtro de tipo de vehículo si existe
          if (!filters?.vehicleType || categoryName === filters.vehicleType) {
            const existing = revenues.get(categoryId);
            if (existing) {
              existing.revenue += revenue;
            } else {
              revenues.set(categoryId, {
                categoryId,
                categoryName,
                revenue
              });
            }
          }
        }
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

  async getPaymentMethodRevenue(filters?: MetricsFilters): Promise<PaymentMethodRevenue[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    
    // Obtener IDs de status APROBADAS y COMPLETADAS
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    if (statusIds.length === 0) {
      this.logger.warn(`[getPaymentMethodRevenue] Status '${BOOKING_STATUS.APPROVED}' o '${BOOKING_STATUS.COMPLETED}' no encontrados`);
      return [];
    }

    // CAMBIO: Filtrar por createdAt de la reserva en lugar de paymentDate
    // Esto asegura consistencia con el reporte de transacciones
    // IMPORTANTE: Manejar reservas con payments vacío pero totalPaid > 0
    
    const matchStage: any = { 
      status: { $in: statusIds },
      ...(dateFilter && { createdAt: dateFilter }),
      totalPaid: { $gt: 0 }
    };
    
    const aggregationPipeline: any[] = [
      { $match: matchStage },
      {
        $project: {
          _id: 1,
          totalPaid: 1,
          payments: 1,
          paymentMethod: 1,
          hasPayments: { $gt: [{ $size: { $ifNull: ['$payments', []] } }, 0] }
        }
      },
      {
        $facet: {
          // Caso 1: Reservas con payments poblado
          withPayments: [
            { $match: { hasPayments: true } },
            { $unwind: '$payments' },
            { 
              $match: { 
                'payments.status': 'PAID'
              } 
            },
            {
              $group: {
                _id: '$payments.paymentType',
                revenue: { $sum: '$payments.amount' }
              }
            }
          ],
          // Caso 2: Reservas sin payments pero con totalPaid > 0
          withoutPayments: [
            { $match: { hasPayments: false } },
            {
              $lookup: {
                from: 'cat_payment_method',
                localField: 'paymentMethod',
                foreignField: '_id',
                as: 'paymentMethodData'
              }
            },
            {
              $unwind: {
                path: '$paymentMethodData',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: { $ifNull: ['$paymentMethodData.name', 'N/A'] },
                revenue: { $sum: '$totalPaid' }
              }
            }
          ]
        }
      },
      {
        $project: {
          combined: { $concatArrays: ['$withPayments', '$withoutPayments'] }
        }
      },
      { $unwind: '$combined' },
      { $replaceRoot: { newRoot: '$combined' } },
      {
        $group: {
          _id: '$_id',
          revenue: { $sum: '$revenue' }
        }
      },
      {
        $project: {
          _id: 0,
          paymentMethodId: '$_id',
          paymentMethodName: '$_id',
          revenue: '$revenue'
        }
      },
      {
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
    const statusIds = await this.getApprovedStatusIds();

    // 1. Obtener conteo de vehículos por categoría en UNA consulta
    const vehicleCountPipeline: any[] = [
      {
        $match: {
          isActive: true,
          ...(filters?.vehicleType && { 'category.name': filters.vehicleType })
        }
      },
      {
        $lookup: {
          from: 'cat_category',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      {
        $unwind: '$categoryData'
      },
      {
        $group: {
          _id: '$categoryData._id',
          categoryName: { $first: '$categoryData.name' },
          totalVehicles: { $sum: 1 }
        }
      }
    ];

    const vehicleCounts = await this.vehicleModel.aggregate(vehicleCountPipeline);
    const categoryMap = new Map<string, { categoryName: string; totalVehicles: number; count: number }>();

    // Inicializar el mapa con los conteos de vehículos
    for (const vc of vehicleCounts) {
      categoryMap.set(vc._id.toString(), {
        categoryName: vc.categoryName,
        totalVehicles: vc.totalVehicles,
        count: 0
      });
    }

    // 2. Obtener bookings APROBADAS/COMPLETADAS creadas en el período
    const bookingsMatch: any = {
      status: { $in: statusIds },
      ...(dateFilter && { createdAt: dateFilter })
    };

    const bookings = await this.bookingModel.find(bookingsMatch).select('cart').lean();
    
    // Recolectar todos los IDs de vehículos únicos y contar por vehículo individual
    const vehicleIds = new Set<string>();
    const vehicleBookingCount = new Map<string, number>();

    for (const booking of bookings) {
      try {
        const cart = JSON.parse(booking.cart);
        
        // SOLO procesar vehículos, NO tours, transfers ni tickets
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            if (vehicleItem.vehicle) {
              const vehicleId = vehicleItem.vehicle._id?.toString() || vehicleItem.vehicle.toString();
              vehicleIds.add(vehicleId);
              // Contar cada vez que este vehículo aparece en una reserva pagada
              vehicleBookingCount.set(vehicleId, (vehicleBookingCount.get(vehicleId) || 0) + 1);
            }
          }
        }
        // NO procesar tours, transfers ni tickets en el gráfico de utilización
      } catch (error) {
        // Ignorar errores de parsing de carrito
      }
    }

    // 3. Obtener categorías de todos los vehículos en UNA consulta
    if (vehicleIds.size > 0) {
      const vehiclesWithCategories = await this.vehicleModel
        .find({ _id: { $in: Array.from(vehicleIds) } })
        .select('category')
        .lean();

      // Contar bookings por categoría
      for (const vehicle of vehiclesWithCategories) {
        if (vehicle.category) {
          const categoryId = vehicle.category.toString();
          const categoryData = categoryMap.get(categoryId);
          if (categoryData) {
            const vehicleId = vehicle._id.toString();
            const bookingCount = vehicleBookingCount.get(vehicleId) || 0;
            categoryData.count += bookingCount;
          }
        }
      }
    }

    // 4. Calcular total de bookings
    const totalBookingsCount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.count, 0);

    // 5. Construir resultado
    const utilizations: CategoryUtilization[] = [];

    for (const [categoryId, categoryData] of categoryMap.entries()) {
      const utilizationPercentage = totalBookingsCount > 0 
        ? (categoryData.count / totalBookingsCount) * 100 
        : 0;

      utilizations.push({
        categoryId,
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
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
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
        // Ignorar errores de parsing de carrito
      }
    }

    // UNA SOLA consulta para obtener todos los vehículos
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
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 1);
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

      // CAMBIO: Filtrar por createdAt de la reserva en lugar de paymentDate
      // Esto asegura que los ingresos se muestren según la fecha de creación de la reserva
      // que es consistente con el listado de reservas
      
      // IMPORTANTE: Manejar dos casos:
      // 1. Reservas con array payments poblado
      // 2. Reservas con totalPaid > 0 pero payments vacío (reservas antiguas o migradas)
      
      const incomePipeline: any[] = [
        { 
          $match: { 
            status: { $in: statusIds },
            ...(dateFilter && { createdAt: dateFilter }),
            totalPaid: { $gt: 0 } // Solo reservas con pago
          } 
        },
        {
          $project: {
            _id: 1,
            bookingNumber: 1,
            totalPaid: 1,
            createdAt: 1,
            payments: 1,
            hasPayments: { $gt: [{ $size: { $ifNull: ['$payments', []] } }, 0] }
          }
        },
        {
          $facet: {
            // Caso 1: Reservas con payments poblado
            withPayments: [
              { $match: { hasPayments: true } },
              { $unwind: '$payments' },
              { 
                $match: { 
                  'payments.status': 'PAID'
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
            ],
            // Caso 2: Reservas sin payments pero con totalPaid > 0
            withoutPayments: [
              { $match: { hasPayments: false } },
              {
                $project: {
                  _id: 0,
                  type: { $literal: 'INCOME' },
                  date: '$createdAt',
                  amount: '$totalPaid',
                  description: { 
                    $concat: [
                      "Pago - Reserva #",
                      { $toString: "$bookingNumber" }
                    ]
                  },
                  sourceId: { $toString: '$_id' },
                  paymentType: { $literal: 'N/A' }
                }
              }
            ]
          }
        },
        {
          $project: {
            combined: { $concatArrays: ['$withPayments', '$withoutPayments'] }
          }
        },
        { $unwind: '$combined' },
        { $replaceRoot: { newRoot: '$combined' } }
      ];
      
      const incomeDetails = await this.bookingModel.aggregate(incomePipeline);
      combinedTransactions.push(...incomeDetails);
    }

    // --- 2. OBTENER LOS DETALLES DE EGRESOS (MOVEMENTS) ---
    if (includeExpenses) {
      const expenseMatch: any = {
        direction: 'OUT',
        isDeleted: { $ne: true }
      };
      if (dateFilter) {
        // Usamos 'date' para los movimientos, no 'createdAt'
        expenseMatch.date = dateFilter;
      }
      
      // Filtrar por tipo de movimiento si se especifica
      if (filters?.movementType) {
        // Si es MANTENIMIENTO, incluir también MANTENIMIENTO VEHICULO
        if (filters.movementType === 'MANTENIMIENTO') {
          expenseMatch.type = { $in: ['MANTENIMIENTO', 'MANTENIMIENTO VEHICULO'] };
        } else {
          expenseMatch.type = filters.movementType;
        }
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
            sourceId: '$_id',
            movementType: '$type'
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

    // Obtener ID de categoría si se filtra por vehicleType
    let categoryId: any = null;
    if (filters?.vehicleType) {
      const category = await this.categoryModel.findOne({ name: filters.vehicleType });
      if (category) {
        categoryId = category._id;
      }
    }

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
      }
    ];

    // Agregar filtro de categoría si existe
    if (categoryId) {
      pipeline.push({
        $match: {
          'categoryData._id': categoryId
        }
      });
    }

    pipeline.push({
      $project: {
        _id: 0,
        vehicleId: { $toString: '$_id' },
        vehicleTag: '$vehicleData.tag',
        vehicleName: '$vehicleData.name',
        categoryName: { $ifNull: ['$categoryData.name', 'Sin categoría'] },
        totalExpenses: 1,
        expenseCount: 1
      }
    });

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

    return result;
  }
}