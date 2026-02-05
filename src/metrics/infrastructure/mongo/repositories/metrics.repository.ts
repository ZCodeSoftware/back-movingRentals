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
  PaymentMediumRevenue,
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

  /**
   * Helper para verificar si una categoría coincide con el filtro de vehicleType
   * Ahora soporta múltiples tipos de vehículos
   */
  private matchesVehicleTypeFilter(categoryName: string, vehicleTypeFilter?: string[]): boolean {
    if (!vehicleTypeFilter || vehicleTypeFilter.length === 0) {
      return true; // Sin filtro, incluir todos
    }
    return vehicleTypeFilter.includes(categoryName);
  }

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Vehicle') private readonly vehicleModel: Model<Vehicle>,
    @InjectModel('Booking') private readonly bookingModel: Model<Booking>,
    @InjectModel('Movement') private readonly movementModel: Model<Movement>,
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('CatCategory') private readonly categoryModel: Model<CatCategory>,
    @InjectModel('CatStatus') private readonly statusModel: Model<CatStatus>,
    @InjectModel('Contract') private readonly contractModel: Model<any>,
    @InjectModel('ContractHistory') private readonly contractHistoryModel: Model<any>,
    @InjectModel('CatContractEvent') private readonly catContractEventModel: Model<any>,
    @InjectModel('VehicleOwner') private readonly vehicleOwnerModel: Model<any>,
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

    this.logger.log(`[getVehicleFinancialDetails] ===== INICIO REPORTE VEHÍCULO ${vehicleId} =====`);
    this.logger.log(`[getVehicleFinancialDetails] Filtro de fecha: ${JSON.stringify(dateFilter)}`);

    // --- 1. OBTENER LOS EGRESOS (MOVEMENTS) ASOCIADOS AL VEHÍCULO ---
    const expenseMatch: any = {
      direction: 'OUT',
      vehicle: new mongoose.Types.ObjectId(vehicleId),
      isDeleted: { $ne: true }
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

    // CORRECCIÓN: Obtener IDs de estados excluidos (CANCELADO, RECHAZADO)
    const excludedStatuses = await this.statusModel.find({
      name: { $in: EXCLUDED_BOOKING_STATUSES }
    }).select('_id').lean();
    const excludedStatusIds = excludedStatuses.map(s => s._id);

    // Obtener TODAS las reservas APROBADAS/COMPLETADAS (excluyendo canceladas/rechazadas) con populate de paymentMethod
    const incomeMatch: any = {
      status: { $in: statusIds }
    };

    // IMPORTANTE: Excluir explícitamente reservas canceladas/rechazadas
    if (excludedStatusIds.length > 0) {
      incomeMatch.status = {
        $in: statusIds,
        $nin: excludedStatusIds
      };
    }

    // CORRECCIÓN CRÍTICA: NO filtrar por createdAt aquí
    // El filtro de fecha se aplicará después, basándose en la fecha de pago aprobado
    // Esto permite incluir reservas creadas fuera del rango si el pago se aprobó dentro del rango
    
    const bookings = await this.bookingModel.find(incomeMatch).populate('paymentMethod').lean();
    
    this.logger.log(`[getVehicleFinancialDetails] Total de reservas APROBADAS/COMPLETADAS encontradas: ${bookings.length}`);
    this.logger.log(`[getVehicleFinancialDetails] Estados excluidos: ${excludedStatusIds.length > 0 ? excludedStatusIds.map(id => id.toString()).join(', ') : 'ninguno'}`);
    
    // OPTIMIZACIÓN: Obtener todos los contratos de una vez
    const bookingIds = bookings.map(b => b._id);
    const contractsMap = new Map();
    
    if (bookingIds.length > 0) {
      // CORRECCIÓN: El campo booking puede ser un ObjectId O un objeto poblado
      // Intentar ambas formas de búsqueda
      const contracts = await this.contractModel.find({
        $or: [
          { booking: { $in: bookingIds } },
          { 'booking._id': { $in: bookingIds } }
        ]
      }).lean();
      
      this.logger.debug(`[getVehicleFinancialDetails] Contratos encontrados: ${contracts.length} de ${bookingIds.length} bookings`);
      
      for (const contract of contracts) {
        // El booking puede ser un ObjectId o un objeto poblado
        const bookingId = (contract as any).booking?._id 
          ? (contract as any).booking._id.toString() 
          : (contract as any).booking.toString();
        contractsMap.set(bookingId, contract);
      }
    }

    // OPTIMIZACIÓN: Obtener cambios de vehículo desde contract.snapshots
    // Si los snapshots no tienen fecha, usar contract_history como fallback
    const vehicleChangesMap = new Map();
    
    for (const contract of Array.from(contractsMap.values())) {
      const contractId = (contract as any)._id.toString();
      const snapshots = (contract as any).snapshots || [];
      
      // Filtrar snapshots que tienen cambios de vehículo
      let vehicleChanges = snapshots.filter((snapshot: any) => {
        const changes = snapshot.changes || [];
        return changes.some((change: any) => change.field === 'booking.cart.vehicles');
      });
      
      // Si los snapshots no tienen fecha válida, buscar en contract_history
      if (vehicleChanges.length > 0) {
        const hasValidTimestamp = vehicleChanges.some((s: any) => s.timestamp || s.createdAt);
        
        if (!hasValidTimestamp) {
          // Buscar en contract_history como fallback
          try {
            const vehicleChangeEvent = await this.catContractEventModel.findOne({ name: 'CAMBIO DE VEHICULO' }).lean();
            if (vehicleChangeEvent) {
              const historyChanges = await this.contractHistoryModel.find({
                contract: (contract as any)._id,
                eventType: (vehicleChangeEvent as any)._id,
                isDeleted: { $ne: true }
              }).sort({ createdAt: 1 }).lean();
              
              if (historyChanges.length > 0) {
                this.logger.debug(`[getVehicleFinancialDetails] Usando contract_history para contrato ${contractId} (snapshots sin fecha)`);
                vehicleChanges = historyChanges;
              }
            }
          } catch (error) {
            this.logger.warn(`[getVehicleFinancialDetails] Error al buscar en contract_history para contrato ${contractId}:`, error);
          }
        }
      }
      
      if (vehicleChanges.length > 0) {
        vehicleChangesMap.set(contractId, vehicleChanges);
      }
    }

    const incomeDetails: TransactionDetail[] = [];
    let processedBookings = 0;
    let skippedBookings = 0;
    let bookingsWithVehicle = 0;

    for (const booking of bookings) {
      try {
        const cart = JSON.parse((booking as any).cart);
        const payments = (booking as any).payments || [];
        
        // Verificar si el vehículo está en el carrito actual O en el historial (vehículos removidos por cambio)
        let vehicleFoundInCart = false;
        let vehicleItemTotal = 0;
        let vehicleDates: { start: Date; end: Date } | null = null;
        let isOldVehicle = false; // Indica si el vehículo fue removido (está en oldValue)
        
        // 1. Buscar en el cart actual
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            const vehicleInCartId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
            if (vehicleInCartId === vehicleId) {
              vehicleFoundInCart = true;
              vehicleItemTotal = vehicleItem.total || 0;
              if (vehicleItem.dates?.start && vehicleItem.dates?.end) {
                vehicleDates = {
                  start: new Date(vehicleItem.dates.start),
                  end: new Date(vehicleItem.dates.end)
                };
              }
              break;
            }
          }
        }
        
        // 2. Si no está en el cart actual, buscar en el historial (vehículos removidos)
        if (!vehicleFoundInCart) {
          const contract = contractsMap.get((booking as any)._id.toString());
          if (contract) {
            const contractId = (contract as any)._id.toString();
            const vehicleChanges = vehicleChangesMap.get(contractId) || [];
            
            for (const change of vehicleChanges) {
              const changes = (change as any).changes || [];
              for (const changeDetail of changes) {
                if (changeDetail.field === 'booking.cart.vehicles') {
                  const oldVehicles = changeDetail.oldValue || [];
                  
                  for (const oldVehicleItem of oldVehicles) {
                    const oldVehicleId = oldVehicleItem.vehicle?._id?.toString() || oldVehicleItem.vehicle?.toString();
                    if (oldVehicleId === vehicleId) {
                      vehicleFoundInCart = true;
                      isOldVehicle = true;
                      vehicleItemTotal = oldVehicleItem.total || 0;
                      if (oldVehicleItem.dates?.start && oldVehicleItem.dates?.end) {
                        vehicleDates = {
                          start: new Date(oldVehicleItem.dates.start),
                          end: new Date(oldVehicleItem.dates.end)
                        };
                      }
                      break;
                    }
                  }
                }
                if (vehicleFoundInCart) break;
              }
              if (vehicleFoundInCart) break;
            }
          }
        }

        // Si el vehículo no participó en esta reserva, saltar
        if (!vehicleFoundInCart) {
          skippedBookings++;
          continue;
        }
        
        bookingsWithVehicle++;
        this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Vehículo encontrado (${isOldVehicle ? 'removido' : 'actual'}), Total base: ${vehicleItemTotal}`);
        
        // IMPORTANTE: Sumar los ajustes (cambios de vehículo, extensiones, combustible, etc.)
        // Los ajustes están en booking.bookingTotals.adjustments
        // Los ajustes de CAMBIO DE VEHICULO se suman al vehículo NUEVO (que entra)
        // Las extensiones y otros ajustes se suman al vehículo correspondiente
        let vehicleAdjustments = 0;
        const bookingTotals = (booking as any).bookingTotals;
        
        this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: bookingTotals existe? ${!!bookingTotals}, adjustments existe? ${!!bookingTotals?.adjustments}, es array? ${Array.isArray(bookingTotals?.adjustments)}, length: ${bookingTotals?.adjustments?.length || 0}`);
        
        // CORRECCIÓN: Los ajustes pueden estar en bookingTotals.adjustments O en contract_history
        // Intentar primero desde bookingTotals, si no existe, buscar en contract_history
        let adjustmentsToProcess: any[] = [];
        
        if (bookingTotals && bookingTotals.adjustments && Array.isArray(bookingTotals.adjustments) && bookingTotals.adjustments.length > 0) {
          // Caso 1: Ajustes en bookingTotals (estructura nueva)
          adjustmentsToProcess = bookingTotals.adjustments;
          this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Usando ajustes de bookingTotals (${adjustmentsToProcess.length} ajustes)`);
        } else {
          // Caso 2: Buscar ajustes en contract_history (estructura antigua)
          const contract = contractsMap.get((booking as any)._id.toString());
          if (contract) {
            try {
              // Buscar eventos de tipo "CAMBIO DE VEHICULO" y "COMBUSTIBLE PAGADO POR CLIENTE"
              const adjustmentEvents = await this.catContractEventModel.find({
                name: { $in: ['CAMBIO DE VEHICULO', 'COMBUSTIBLE PAGADO POR CLIENTE', 'EXTENSION'] }
              }).lean();
              
              const adjustmentEventIds = adjustmentEvents.map((e: any) => e._id);
              
              if (adjustmentEventIds.length > 0) {
                const historyAdjustments = await this.contractHistoryModel.find({
                  contract: (contract as any)._id,
                  eventType: { $in: adjustmentEventIds },
                  isDeleted: { $ne: true },
                  'eventMetadata.amount': { $exists: true }
                }).lean();
                
                // Convertir a formato de adjustments
                for (const historyItem of historyAdjustments) {
                  const eventType = adjustmentEvents.find((e: any) => e._id.toString() === (historyItem as any).eventType.toString());
                  adjustmentsToProcess.push({
                    eventType: (historyItem as any).eventType,
                    eventName: eventType ? (eventType as any).name : 'AJUSTE',
                    amount: (historyItem as any).eventMetadata?.amount || 0,
                    direction: 'IN',
                    date: (historyItem as any).createdAt
                  });
                }
                
                this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Usando ajustes de contract_history (${adjustmentsToProcess.length} ajustes)`);
              }
            } catch (error) {
              this.logger.warn(`[getVehicleFinancialDetails] Error al buscar ajustes en contract_history para reserva #${(booking as any).bookingNumber}:`, error);
            }
          }
        }
        
        // CORRECCIÓN FINAL: Si no hay ajustes en bookingTotals ni en contract_history,
        // calcular los ajustes como la diferencia entre totalPaid y total
        if (adjustmentsToProcess.length === 0) {
          const totalPaid = (booking as any).totalPaid || 0;
          const bookingTotal = (booking as any).total || 0;
          const adjustmentAmount = totalPaid - bookingTotal;
          
          if (adjustmentAmount > 0) {
            // Hay una diferencia positiva - esto son ajustes no documentados
            adjustmentsToProcess.push({
              eventType: null,
              eventName: 'AJUSTE (calculado desde totalPaid)',
              amount: adjustmentAmount,
              direction: 'IN',
              date: (booking as any).updatedAt || (booking as any).createdAt
            });
            
            this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Ajuste calculado desde totalPaid: ${adjustmentAmount} (totalPaid=${totalPaid}, total=${bookingTotal})`);
          }
        }
        
        if (adjustmentsToProcess.length > 0) {
          this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Procesando ${adjustmentsToProcess.length} ajustes`);
          for (const adjustment of adjustmentsToProcess) {
            // Solo sumar ajustes de tipo "IN" (ingresos adicionales)
            if (adjustment.direction === 'IN' && adjustment.amount > 0) {
              // Verificar si es un cambio de vehículo
              const isCambioVehiculo = adjustment.eventName && 
                                      (adjustment.eventName.includes('CAMBIO') || 
                                       adjustment.eventName.includes('VEHICLE'));
              
              if (isCambioVehiculo) {
                // IMPORTANTE: Los cambios de vehículo se suman al vehículo ANTERIOR (oldValue)
                // porque es una penalización/compensación por rescindir el contrato del veh��culo anterior
                if (isOldVehicle) {
                  // Este es el vehículo anterior (removido), NO sumar el ajuste de cambio
                  this.logger.debug(`[getVehicleFinancialDetails] Vehículo ${vehicleId} es el ANTERIOR (removido), NO se suma ajuste de cambio: ${adjustment.eventName} = ${adjustment.amount}`);
                } else {
                  // Este es el vehículo nuevo (que entra), SUMAR el ajuste de cambio
                  vehicleAdjustments += adjustment.amount;
                  this.logger.debug(`[getVehicleFinancialDetails] Ajuste de cambio de vehículo para vehículo NUEVO ${vehicleId}: ${adjustment.eventName} = ${adjustment.amount}`);
                }
              } else {
                // Otros ajustes (extensiones, combustible, etc.) se suman al vehículo correspondiente
                vehicleAdjustments += adjustment.amount;
                this.logger.debug(`[getVehicleFinancialDetails] Ajuste encontrado para ${vehicleId}: ${adjustment.eventName} = ${adjustment.amount}`);
              }
            }
          }
        }
        
        // El total del vehículo incluye el monto base + ajustes
        const totalVehicleAmount = vehicleItemTotal + vehicleAdjustments;
        
        this.logger.debug(`[getVehicleFinancialDetails] Vehículo ${vehicleId} en reserva #${(booking as any).bookingNumber}: Base=${vehicleItemTotal}, Ajustes=${vehicleAdjustments}, Total=${totalVehicleAmount}`);

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

        // Obtener la proporción de uso del vehículo si hubo cambios
        let vehicleProportion = 1.0;
        const contract = contractsMap.get((booking as any)._id.toString());
        
        if (contract) {
        const contractId = (contract as any)._id.toString();
        const vehicleChanges = vehicleChangesMap.get(contractId) || [];
        
        if (vehicleChanges.length > 0) {
        const proportionInfo = this.calculateVehicleProportionFromChanges(
        vehicleChanges,
        vehicleId,
        cart
        );
        
        if (proportionInfo) {
        vehicleProportion = proportionInfo.proportion;
        this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Proporción calculada: ${vehicleProportion.toFixed(2)} (${proportionInfo.dates.start.toISOString()} a ${proportionInfo.dates.end.toISOString()})`);
        } else {
        this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: No se pudo calcular proporción, usando 1.0`);
        }
        }
        }
        
        // IMPORTANTE: Si la proporción es menor al 1%, NO generar ingreso (vehículo reemplazado inmediatamente)
        if (vehicleProportion < 0.01) {
        this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Vehículo ${vehicleId} removido inmediatamente (proporción < 1%), NO se genera ingreso`);
        skippedBookings++;
        continue; // Saltar esta reserva
        }
        
        // IMPORTANTE: Manejar reservas SIN array de payments (reservas antiguas/migradas)
        if (payments.length === 0 && (booking as any).totalPaid > 0) {
          // Reserva antigua sin payments pero con totalPaid
          const createdAt = new Date((booking as any).createdAt);
          
          // CORRECCIÓN: Usar el monto del vehículo (totalVehicleAmount) multiplicado por la proporción de tiempo
          // NO usar totalPaid porque incluye tours, transfers, etc. que no son del propietario del vehículo
          const proratedAmount = totalVehicleAmount * vehicleProportion;
          
          this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber} (sin payments): Monto prorrateado = ${totalVehicleAmount} * ${vehicleProportion} = ${proratedAmount}`);
          
          incomeDetails.push({
            type: 'INCOME',
            date: createdAt,
            amount: Math.round(proratedAmount * 100) / 100,
            description: `Pago - Reserva #${(booking as any).bookingNumber}${vehicleProportion < 1 ? ` (${(vehicleProportion * 100).toFixed(0)}% del período)` : ''}`,
            sourceId: (booking as any)._id.toString(),
          });
        } else if (payments.length > 0) {
          // CORRECCIÓN: Para reservas CON payments, generar UN SOLO ingreso por reserva
          // El monto es el total del vehículo multiplicado por la proporción de tiempo
          // NO iterar sobre cada pago porque eso duplica los ingresos
          
          // Verificar si al menos un pago está PAID
          const hasPaidPayment = payments.some((p: any) => p.status === 'PAID');
          
          if (hasPaidPayment) {
            const paymentType = payments[0]?.paymentType?.toUpperCase() || 'OTHER';
            const paymentMethod = ((booking as any).paymentMethod as any)?.name?.toUpperCase() || '';
            
            // Determinar la fecha según el tipo de pago
            let effectiveDate: Date;
            
            if (paymentType === 'CASH' || paymentMethod.includes('EFECTIVO')) {
              // EFECTIVO: 20% en fecha de carga (createdAt), 80% en fecha de aprobación (paymentDate)
              const createdAt = new Date((booking as any).createdAt);
              // Buscar el primer pago PAID para obtener la fecha de aprobación
              const firstPaidPayment = payments.find((p: any) => p.status === 'PAID');
              const paymentDate = firstPaidPayment ? new Date(firstPaidPayment.paymentDate) : createdAt;
              
              // CORRECCIÓN: Usar totalVehicleAmount (que incluye ajustes) en lugar de vehicleItemTotal
              const proratedAmount = totalVehicleAmount * vehicleProportion;
              
              const amount20 = proratedAmount * 0.20;
              const amount80 = proratedAmount * 0.80;
              
              // 20% en fecha de carga
              incomeDetails.push({
                type: 'INCOME',
                date: createdAt,
                amount: Math.round(amount20 * 100) / 100,
                description: `Efectivo 20% - Reserva #${(booking as any).bookingNumber}${vehicleProportion < 1 ? ` (${(vehicleProportion * 100).toFixed(0)}% del período)` : ''}`,
                sourceId: (booking as any)._id.toString(),
              });
              
              // 80% en fecha de aprobación
              incomeDetails.push({
                type: 'INCOME',
                date: paymentDate,
                amount: Math.round(amount80 * 100) / 100,
                description: `Efectivo 80% - Reserva #${(booking as any).bookingNumber}${vehicleProportion < 1 ? ` (${(vehicleProportion * 100).toFixed(0)}% del período)` : ''}`,
                sourceId: (booking as any)._id.toString(),
              });
            } else if (paymentType === 'TRANSFER' || paymentMethod.includes('TRANSFERENCIA')) {
              // TRANSFERENCIA: Fecha de aprobación (paymentDate del primer pago PAID)
              const firstPaidPayment = payments.find((p: any) => p.status === 'PAID');
              effectiveDate = firstPaidPayment ? new Date(firstPaidPayment.paymentDate) : new Date((booking as any).createdAt);
              
              // CORRECCIÓN: Usar totalVehicleAmount (que incluye ajustes) en lugar de vehicleItemTotal
              const proratedAmount = totalVehicleAmount * vehicleProportion;
              
              this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Generando ingreso = ${totalVehicleAmount} * ${vehicleProportion} = ${proratedAmount} (fecha: ${effectiveDate.toISOString()})`);

              incomeDetails.push({
                type: 'INCOME',
                date: effectiveDate,
                amount: Math.round(proratedAmount * 100) / 100,
                description: `Transferencia - Reserva #${(booking as any).bookingNumber}${vehicleProportion < 1 ? ` (${(vehicleProportion * 100).toFixed(0)}% del período)` : ''}`,
                sourceId: (booking as any)._id.toString(),
              });
            } else {
              // CRÉDITO/DÉBITO y OTROS: Fecha de carga (createdAt)
              effectiveDate = new Date((booking as any).createdAt);
              
              // CORRECCIÓN: Usar totalVehicleAmount (que incluye ajustes) en lugar de vehicleItemTotal
              const proratedAmount = totalVehicleAmount * vehicleProportion;
              
              this.logger.debug(`[getVehicleFinancialDetails] Reserva #${(booking as any).bookingNumber}: Generando ingreso = ${totalVehicleAmount} * ${vehicleProportion} = ${proratedAmount} (fecha: ${effectiveDate.toISOString()})`);

              incomeDetails.push({
                type: 'INCOME',
                date: effectiveDate,
                amount: Math.round(proratedAmount * 100) / 100,
                description: `Pago - Reserva #${(booking as any).bookingNumber}${vehicleProportion < 1 ? ` (${(vehicleProportion * 100).toFixed(0)}% del período)` : ''}`,
                sourceId: (booking as any)._id.toString(),
              });
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Error al procesar el carrito del booking ${(booking as any)._id}:`, error);
      }
    }

    // --- 3. OBTENER EXTENSIONES DEL VEHÍCULO ---
    try {
      const contracts = await this.contractModel.find({ 
        vehicle: new mongoose.Types.ObjectId(vehicleId) 
      }).select('_id');
      
      const contractIds = contracts.map(c => c._id);
      
      if (contractIds.length > 0) {
        const extensions = await this.contractHistoryModel.find({
          contract: { $in: contractIds },
          action: 'EXTENSION_UPDATED',
          isDeleted: { $ne: true },
          'eventMetadata.amount': { $exists: true, $gt: 0 }
        }).lean();
        
        for (const extension of extensions) {
          const extensionDate = new Date((extension as any).createdAt);
          const extensionAmount = (extension as any).eventMetadata?.amount || 0;
          
          incomeDetails.push({
            type: 'INCOME',
            date: extensionDate,
            amount: extensionAmount,
            description: `Extensión de Renta - Contrato`,
            sourceId: (extension as any)._id.toString(),
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Error al procesar extensiones del vehículo ${vehicleId}:`, error);
    }

    this.logger.log(`[getVehicleFinancialDetails] ===== RESUMEN =====`);
    this.logger.log(`[getVehicleFinancialDetails] Total reservas analizadas: ${bookings.length}`);
    this.logger.log(`[getVehicleFinancialDetails] Reservas con este vehículo: ${bookingsWithVehicle}`);
    this.logger.log(`[getVehicleFinancialDetails] Reservas omitidas (sin vehículo): ${skippedBookings}`);
    this.logger.log(`[getVehicleFinancialDetails] Transacciones de ingreso generadas: ${incomeDetails.length}`);
    
    // LOG DETALLADO: Listar todas las reservas que tienen este vehículo
    this.logger.log(`[getVehicleFinancialDetails] ===== RESERVAS CON VEHÍCULO ${vehicleId} =====`);
    for (const booking of bookings) {
      try {
        const cart = JSON.parse((booking as any).cart);
        let vehicleFoundInCart = false;
        let isOldVehicle = false;
        
        // Buscar en el cart actual
        if (cart.vehicles && Array.isArray(cart.vehicles)) {
          for (const vehicleItem of cart.vehicles) {
            const vehicleInCartId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
            if (vehicleInCartId === vehicleId) {
              vehicleFoundInCart = true;
              break;
            }
          }
        }
        
        // Buscar en el historial (vehículos removidos)
        if (!vehicleFoundInCart) {
          const contract = contractsMap.get((booking as any)._id.toString());
          if (contract) {
            const contractId = (contract as any)._id.toString();
            const vehicleChanges = vehicleChangesMap.get(contractId) || [];
            
            for (const change of vehicleChanges) {
              const changes = (change as any).changes || [];
              for (const changeDetail of changes) {
                if (changeDetail.field === 'booking.cart.vehicles') {
                  const oldVehicles = changeDetail.oldValue || [];
                  
                  for (const oldVehicleItem of oldVehicles) {
                    const oldVehicleId = oldVehicleItem.vehicle?._id?.toString() || oldVehicleItem.vehicle?.toString();
                    if (oldVehicleId === vehicleId) {
                      vehicleFoundInCart = true;
                      isOldVehicle = true;
                      break;
                    }
                  }
                }
                if (vehicleFoundInCart) break;
              }
              if (vehicleFoundInCart) break;
            }
          }
        }
        
        if (vehicleFoundInCart) {
          const payments = (booking as any).payments || [];
          const totalPaid = (booking as any).totalPaid || 0;
          const bookingNumber = (booking as any).bookingNumber;
          const createdAt = new Date((booking as any).createdAt);
          
          this.logger.log(`[getVehicleFinancialDetails] ✓ Reserva #${bookingNumber} (${isOldVehicle ? 'REMOVIDO' : 'ACTUAL'}): Creada=${createdAt.toISOString()}, Payments=${payments.length}, TotalPaid=${totalPaid}`);
          
          // Verificar si está en el rango de fecha
          if (dateFilter) {
            const inRange = this.isDateInRange(createdAt, dateFilter);
            if (!inRange) {
              this.logger.warn(`[getVehicleFinancialDetails]   ⚠ Reserva #${bookingNumber} FUERA DEL RANGO DE FECHA (${createdAt.toISOString()})`);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Error al procesar el carrito del booking ${(booking as any)._id}:`, error);
      }
    }
    this.logger.log(`[getVehicleFinancialDetails] ===== FIN LISTADO DE RESERVAS =====`);

    // --- 4. FILTRAR TRANSACCIONES POR FECHA DE PAGO ---
    // IMPORTANTE: Filtrar por la fecha de la transacción (fecha de pago aprobado)
    // NO por la fecha de creación de la reserva
    let filteredIncomeDetails = incomeDetails;
    let filteredExpenseDetails = expenseDetails;
    
    if (dateFilter) {
      this.logger.debug(`[getVehicleFinancialDetails] Filtrando transacciones por fecha de pago: ${JSON.stringify(dateFilter)}`);
      
      filteredIncomeDetails = incomeDetails.filter(t => {
        const transactionDate = new Date(t.date);
        const inRange = transactionDate >= dateFilter.$gte && transactionDate < dateFilter.$lt;
        
        if (!inRange) {
          this.logger.debug(`[getVehicleFinancialDetails] Transacción EXCLUIDA: ${t.description} (fecha: ${transactionDate.toISOString()})`);
        }
        
        return inRange;
      });
      
      // Los gastos ya están filtrados por fecha en la consulta inicial
    }
    
    this.logger.log(`[getVehicleFinancialDetails] Transacciones de ingreso después del filtro de fecha: ${filteredIncomeDetails.length} de ${incomeDetails.length}`);
    
    // --- 5. COMBINAR Y ORDENAR LOS RESULTADOS ---
    const combinedTransactions = [...filteredIncomeDetails, ...filteredExpenseDetails];
    combinedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIncome = filteredIncomeDetails.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredExpenseDetails.reduce((sum, t) => sum + t.amount, 0);
    this.logger.log(`[getVehicleFinancialDetails] ===== TOTALES =====`);
    this.logger.log(`[getVehicleFinancialDetails] Ingresos: ${totalIncome.toFixed(2)}`);
    this.logger.log(`[getVehicleFinancialDetails] Gastos: ${totalExpenses.toFixed(2)}`);
    this.logger.log(`[getVehicleFinancialDetails] Neto: ${(totalIncome - totalExpenses).toFixed(2)}`);
    this.logger.log(`[getVehicleFinancialDetails] ===== FIN REPORTE =====`);

    return combinedTransactions;
  }

  /**
   * Calcula la proporción de uso de un vehículo basándose en los cambios ya obtenidos
   * Versión optimizada que no hace consultas adicionales
   * 
   * IMPORTANTE: Para vehículos REMOVIDOS (cambio de vehículo):
   * - El vehículo estuvo desde su fecha de inicio HASTA la fecha del cambio
   * - NO hasta su fecha de fin original (porque fue reemplazado antes)
   * 
   * Para vehículos AGREGADOS (reemplazo):
   * - El vehículo estuvo desde la fecha del cambio HASTA su fecha de fin
   */
  private calculateVehicleProportionFromChanges(
    vehicleChanges: any[],
    vehicleId: string,
    currentCart: any
  ): { proportion: number; vehicleTotal: number; dates: { start: Date; end: Date } } | null {
    try {
      if (vehicleChanges.length === 0) {
        return null;
      }
      
      let vehicleStartDate: Date | null = null;
      let vehicleEndDate: Date | null = null;
      let vehicleTotal = 0;
      let totalRentalStartDate: Date | null = null;
      let totalRentalEndDate: Date | null = null;
      
      // Primero, buscar el vehículo en los cambios para determinar si fue removido o agregado
      for (let i = 0; i < vehicleChanges.length; i++) {
        const change = vehicleChanges[i];
        // Los snapshots usan 'timestamp', contract_history usa 'createdAt'
        // Esta es la FECHA DEL CAMBIO - cuando se hizo el cambio de vehículo
        const changeDate = new Date(change.timestamp || change.createdAt);
        const changes = change.changes || [];
        
        // DEBUG: Log para verificar la estructura del cambio
        this.logger.debug(`[calculateVehicleProportionFromChanges] Procesando cambio ${i + 1}/${vehicleChanges.length}:`);
        this.logger.debug(`  - timestamp: ${change.timestamp}`);
        this.logger.debug(`  - createdAt: ${change.createdAt}`);
        this.logger.debug(`  - changeDate calculado: ${changeDate.toISOString()}`);
        this.logger.debug(`  - changes.length: ${changes.length}`);
        
        for (const changeDetail of changes) {
          if (changeDetail.field === 'booking.cart.vehicles') {
            const oldVehicles = changeDetail.oldValue || [];
            const newVehicles = changeDetail.newValue || [];
            
            // Buscar el vehículo en oldValue
            const vehicleInOld = oldVehicles.find((v: any) => {
              const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
              return vId === vehicleId;
            });
            
            // Buscar el vehículo en newValue
            const vehicleInNew = newVehicles.find((v: any) => {
              const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
              return vId === vehicleId;
            });
            
            const wasInOld = !!vehicleInOld;
            const isInNew = !!vehicleInNew;
            
            if (wasInOld && !isInNew) {
              // El vehículo fue REMOVIDO (estaba en oldValue, ya no está en newValue)
              // IMPORTANTE: El vehículo estuvo desde su fecha de inicio HASTA que empezó el vehículo de reemplazo
              if (vehicleInOld && vehicleInOld.dates?.start) {
                vehicleStartDate = new Date(vehicleInOld.dates.start);
                const vehicleOriginalEnd = new Date(vehicleInOld.dates.end);
                vehicleTotal = vehicleInOld.total || 0;
                
                // CORRECCIÓN CRÍTICA: Priorizar la fecha de inicio del vehículo de reemplazo
                // Si hay un vehículo de reemplazo, usar su fecha de inicio como fecha de fin del vehículo anterior
                // Esto es más preciso que el timestamp del cambio, que puede registrarse tarde
                
                let effectiveEndDate: Date;
                
                if (newVehicles.length > 0 && newVehicles[0].dates?.start) {
                  // PRIORIDAD 1: Usar la fecha de inicio del vehículo de reemplazo
                  const replacementStartDate = new Date(newVehicles[0].dates.start);
                  
                  // Validar que la fecha de reemplazo esté entre el inicio y fin del vehículo
                  if (replacementStartDate >= vehicleStartDate && replacementStartDate <= vehicleOriginalEnd) {
                    effectiveEndDate = replacementStartDate;
                    this.logger.debug(`[calculateVehicleProportionFromChanges] Usando fecha inicio del reemplazo (PRIORIDAD): ${effectiveEndDate.toISOString()}`);
                  } else if (replacementStartDate > vehicleOriginalEnd) {
                    // Si el reemplazo empieza después del fin original, usar el fin original
                    effectiveEndDate = vehicleOriginalEnd;
                    this.logger.debug(`[calculateVehicleProportionFromChanges] Reemplazo después del fin original, usando fecha fin original: ${effectiveEndDate.toISOString()}`);
                  } else {
                    // Si el reemplazo empieza antes del inicio, usar el timestamp del cambio
                    effectiveEndDate = changeDate >= vehicleStartDate && changeDate <= vehicleOriginalEnd ? changeDate : vehicleOriginalEnd;
                    this.logger.debug(`[calculateVehicleProportionFromChanges] Reemplazo antes del inicio, usando timestamp o fin original: ${effectiveEndDate.toISOString()}`);
                  }
                } else if (changeDate >= vehicleStartDate && changeDate <= vehicleOriginalEnd) {
                  // PRIORIDAD 2: Usar el timestamp del cambio si está dentro del rango
                  effectiveEndDate = changeDate;
                  this.logger.debug(`[calculateVehicleProportionFromChanges] Usando timestamp del cambio (fecha real): ${effectiveEndDate.toISOString()}`);
                } else if (changeDate > vehicleOriginalEnd) {
                  // PRIORIDAD 3: Si el cambio ocurrió después del fin programado, usar el fin original
                  effectiveEndDate = vehicleOriginalEnd;
                  this.logger.debug(`[calculateVehicleProportionFromChanges] Cambio después del fin programado, usando fecha fin original: ${effectiveEndDate.toISOString()}`);
                } else {
                  // Último fallback: usar la fecha de fin original
                  effectiveEndDate = vehicleOriginalEnd;
                  this.logger.debug(`[calculateVehicleProportionFromChanges] Sin timestamp válido ni reemplazo, usando fecha fin original: ${effectiveEndDate.toISOString()}`);
                }
                
                vehicleEndDate = effectiveEndDate;
                
                // Para calcular la proporción, necesitamos las fechas totales de la renta
                // El período total es desde el inicio del vehículo removido hasta el fin del vehículo nuevo
                if (newVehicles.length > 0 && newVehicles[0].dates?.end) {
                  totalRentalStartDate = vehicleStartDate;
                  totalRentalEndDate = new Date(newVehicles[0].dates.end);
                } else if (vehicleInOld.dates?.end) {
                  // Si no hay vehículo nuevo, usar las fechas originales del vehículo removido
                  totalRentalStartDate = vehicleStartDate;
                  totalRentalEndDate = vehicleOriginalEnd;
                }
                
                this.logger.debug(`[calculateVehicleProportionFromChanges] Vehículo ${vehicleId} REMOVIDO:`);
                this.logger.debug(`  - Fecha inicio original: ${vehicleStartDate.toISOString()}`);
                this.logger.debug(`  - Fecha fin original: ${vehicleInOld.dates?.end}`);
                this.logger.debug(`  - Fecha del cambio (timestamp): ${changeDate.toISOString()}`);
                this.logger.debug(`  - Fecha fin efectiva: ${vehicleEndDate.toISOString()}`);
                this.logger.debug(`  - Período real de uso: ${vehicleStartDate.toISOString()} a ${vehicleEndDate.toISOString()}`);
                this.logger.debug(`  - Total base: ${vehicleTotal}`);
              }
            } else if (!wasInOld && isInNew) {
              // El vehículo fue AGREGADO (no estaba en oldValue, ahora está en newValue)
              // IMPORTANTE: El vehículo estuvo desde su fecha de inicio en el carrito hasta su fecha de fin
              // (La fecha de inicio en el carrito ya refleja cuándo empezó a usarse)
              if (vehicleInNew && vehicleInNew.dates?.start && vehicleInNew.dates?.end) {
                // Usar las fechas del vehículo en el carrito
                vehicleStartDate = new Date(vehicleInNew.dates.start);
                vehicleEndDate = new Date(vehicleInNew.dates.end);
                vehicleTotal = vehicleInNew.total || 0;
                
                // Para calcular la proporción, necesitamos las fechas totales de la renta
                // El período total es desde el inicio del vehículo anterior hasta el fin del vehículo nuevo
                if (oldVehicles.length > 0 && oldVehicles[0].dates?.start) {
                  totalRentalStartDate = new Date(oldVehicles[0].dates.start);
                  totalRentalEndDate = vehicleEndDate;
                } else {
                  // Si no hay vehículo anterior, usar las fechas del vehículo nuevo
                  totalRentalStartDate = vehicleStartDate;
                  totalRentalEndDate = vehicleEndDate;
                }
                
                this.logger.debug(`[calculateVehicleProportionFromChanges] Vehículo ${vehicleId} AGREGADO:`);
                this.logger.debug(`  - Fecha inicio en carrito: ${vehicleInNew.dates?.start}`);
                this.logger.debug(`  - Fecha fin en carrito: ${vehicleInNew.dates?.end}`);
                this.logger.debug(`  - Fecha del cambio (timestamp): ${changeDate.toISOString()}`);
                this.logger.debug(`  - Período real de uso: ${vehicleStartDate.toISOString()} a ${vehicleEndDate.toISOString()}`);
                this.logger.debug(`  - Total base: ${vehicleTotal}`);
              }
            }
          }
        }
      }
      
      // Si no encontramos el vehículo en los cambios, buscar en el carrito actual
      if (!vehicleStartDate && !vehicleEndDate) {
        if (currentCart.vehicles && Array.isArray(currentCart.vehicles)) {
          const vehicleInCurrent = currentCart.vehicles.find((v: any) => {
            const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
            return vId === vehicleId;
          });
          
          if (vehicleInCurrent && vehicleInCurrent.dates?.start && vehicleInCurrent.dates?.end) {
            vehicleStartDate = new Date(vehicleInCurrent.dates.start);
            vehicleEndDate = new Date(vehicleInCurrent.dates.end);
            vehicleTotal = vehicleInCurrent.total || 0;
            totalRentalStartDate = vehicleStartDate;
            totalRentalEndDate = vehicleEndDate;
          }
        }
      }
      
      if (!vehicleStartDate || !vehicleEndDate) {
        return null;
      }
      
      // Calcular la duración del vehículo en horas (más preciso que días)
      const vehicleHours = (vehicleEndDate.getTime() - vehicleStartDate.getTime()) / (1000 * 60 * 60);
      
      // IMPORTANTE: Si las fechas están invertidas (horas negativas), retornar null
      if (vehicleHours < 0) {
        this.logger.warn(`[calculateVehicleProportionFromChanges] Fechas invertidas para vehículo ${vehicleId}: start=${vehicleStartDate.toISOString()}, end=${vehicleEndDate.toISOString()}`);
        return null;
      }
      
      // Calcular la duración total de la renta
      let totalRentalHours = vehicleHours; // Por defecto, si no hay período total, usar las horas del vehículo
      
      if (totalRentalStartDate && totalRentalEndDate) {
        totalRentalHours = (totalRentalEndDate.getTime() - totalRentalStartDate.getTime()) / (1000 * 60 * 60);
        
        if (totalRentalHours <= 0) {
          totalRentalHours = vehicleHours;
        }
      }
      
      // Calcular la proporción
      const proportion = totalRentalHours > 0 ? vehicleHours / totalRentalHours : 1.0;
      
      this.logger.debug(`[calculateVehicleProportionFromChanges] Vehículo ${vehicleId}: ${vehicleHours.toFixed(2)} horas de ${totalRentalHours.toFixed(2)} horas totales = ${(proportion * 100).toFixed(2)}%`);
      
      return {
        proportion: Math.max(0, Math.min(1, proportion)),
        vehicleTotal,
        dates: {
          start: vehicleStartDate,
          end: vehicleEndDate
        }
      };
    } catch (error) {
      this.logger.error(`[calculateVehicleProportionFromChanges] Error:`, error);
      return null;
    }
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

    // Obtener IDs de categorías si se filtra por vehicleType (ahora soporta múltiples)
    let categoryIds: any[] = [];
    if (filters?.vehicleType && filters.vehicleType.length > 0) {
      const categories = await this.categoryModel.find({ name: { $in: filters.vehicleType } }).select('_id').lean();
      categoryIds = categories.map(c => c._id);
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
    
    // Si hay filtro de vehicleType, necesitamos filtrar manualmente por bookings que contengan esos tipos
    if (categoryIds.length > 0) {
      // Obtener vehículos de las categorías filtradas
      const vehiclesInCategory = await this.vehicleModel.find({ category: { $in: categoryIds } }).select('_id').lean();
      const vehicleIdsInCategory = new Set(vehiclesInCategory.map(v => v._id.toString()));
      
      // PRE-FILTRADO: Obtener SOLO los bookings que contengan los tipos filtrados
      // IMPORTANTE: Filtrar por createdAt para obtener solo bookings del período
      const allBookings = await this.bookingModel.find({
        status: { $in: statusIds },
        totalPaid: { $gt: 0 },
        ...(dateFilter && { createdAt: dateFilter })
      }).select('_id cart createdAt').lean();
      
      const bookingIdsToInclude = new Set<string>();
      
      for (const booking of allBookings) {
        try {
          const cart = JSON.parse((booking as any).cart);
          let hasMatchingItem = false;
          
          // Verificar vehículos
          if (cart.vehicles && Array.isArray(cart.vehicles)) {
            for (const vehicleItem of cart.vehicles) {
              const vehicleId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
              if (vehicleId && vehicleIdsInCategory.has(vehicleId)) {
                hasMatchingItem = true;
                break;
              }
            }
          }
          
          // Verificar tours
          if (!hasMatchingItem && cart.tours && Array.isArray(cart.tours)) {
            for (const tourItem of cart.tours) {
              const categoryName = tourItem.tour?.category?.name;
              if (categoryName && filters.vehicleType.includes(categoryName)) {
                hasMatchingItem = true;
                break;
              }
            }
          }
          
          // Verificar transfers
          if (!hasMatchingItem && cart.transfer && Array.isArray(cart.transfer)) {
            for (const transferItem of cart.transfer) {
              const categoryName = transferItem.transfer?.category?.name;
              if (categoryName && filters.vehicleType.includes(categoryName)) {
                hasMatchingItem = true;
                break;
              }
            }
          }
          
          // Verificar tickets
          if (!hasMatchingItem && cart.tickets && Array.isArray(cart.tickets)) {
            for (const ticketItem of cart.tickets) {
              const categoryName = ticketItem.ticket?.category?.name;
              if (categoryName && filters.vehicleType.includes(categoryName)) {
                hasMatchingItem = true;
                break;
              }
            }
          }
          
          if (hasMatchingItem) {
            bookingIdsToInclude.add((booking as any)._id.toString());
          }
        } catch (error) {
          // Ignorar errores de parsing
        }
      }
      
      this.logger.debug(`[getMetricsForPeriod] Filtrado por vehicleType: ${bookingIdsToInclude.size} bookings de ${allBookings.length} coinciden`);
      
      // Ahora obtener los bookings filtrados con todos sus datos
      if (bookingIdsToInclude.size === 0) {
        // No hay bookings que coincidan
        totalIncome = 0;
      } else {
        const bookings = await this.bookingModel.find({
          _id: { $in: Array.from(bookingIdsToInclude).map(id => new mongoose.Types.ObjectId(id)) }
        }).lean();
        
        // Calcular ingresos de los bookings filtrados
        // IMPORTANTE: Filtrar por createdAt del booking Y por paymentDate del pago
        for (const booking of bookings) {
          const payments = (booking as any).payments || [];
          const bookingCreatedAt = new Date((booking as any).createdAt);
          
                    
          if (payments.length > 0) {
            // Caso 1: Reservas con payments array
            for (const payment of payments) {
              if (payment.status === 'PAID') {
                totalIncome += payment.amount || 0;
              }
            }
          } else if ((booking as any).totalPaid > 0) {
            // Caso 2: Reservas sin payments pero con totalPaid > 0
            totalIncome += (booking as any).totalPaid;
          }
        }
      }
    } else {
      // Sin filtro de vehicleType, obtener bookings filtradas por fecha
      const bookings = await this.bookingModel.find({
        status: { $in: statusIds },
        totalPaid: { $gt: 0 },
        ...(dateFilter && { createdAt: dateFilter })
      }).lean();
      
      // Calcular ingresos de los bookings filtrados
      for (const booking of bookings) {
        const payments = (booking as any).payments || [];
        
        if (payments.length > 0) {
          // Caso 1: Reservas con payments array - sumar TODOS los pagos PAID
          for (const payment of payments) {
            if (payment.status === 'PAID') {
              totalIncome += payment.amount || 0;
            }
          }
        } else if ((booking as any).totalPaid > 0) {
          // Caso 2: Reservas sin payments pero con totalPaid > 0
          totalIncome += (booking as any).totalPaid;
        }
      }
    }
    
    this.logger.debug(`[getMetricsForPeriod] Total income calculated: ${totalIncome} (dateFilter: ${JSON.stringify(dateFilter)}, categoryFilter: ${categoryIds.length > 0})`);

    // Calcular gastos
    // Si hay filtro de categorías, solo contar gastos de vehículos de esas categorías
    let totalExpenses = 0;
    
    if (categoryIds.length > 0) {
      // Obtener vehículos de las categorías filtradas
      const vehiclesInCategory = await this.vehicleModel.find({ category: { $in: categoryIds } }).select('_id').lean();
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
    if (categoryIds.length > 0) {
      vehicleFilter.category = { $in: categoryIds };
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
                if (this.matchesVehicleTypeFilter(categoryName, filters?.vehicleType)) {
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
                if (this.matchesVehicleTypeFilter(categoryName, filters?.vehicleType)) {
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
                if (this.matchesVehicleTypeFilter(categoryName, filters?.vehicleType)) {
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
          if (this.matchesVehicleTypeFilter(categoryName, filters?.vehicleType)) {
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

    // CAMBIO: Agrupar por paymentType (CASH, TRANSFER, STRIPE, etc.) en lugar de paymentMethod
    // Esto muestra el método de pago general, mientras que paymentMedium muestra el medio específico
    
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
          hasPayments: {
            $and: [
              { $isArray: '$payments' },
              { $gt: [{ $size: '$payments' }, 0] }
            ]
          }
        }
      },
      {
        $facet: {
          // Caso 1: Reservas con payments poblado - agrupar por paymentType
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
                _id: {
                  $switch: {
                    branches: [
                      { case: { $eq: ['$payments.paymentType', 'CASH'] }, then: 'Efectivo' },
                      { case: { $eq: ['$payments.paymentType', 'TRANSFER'] }, then: 'Transferencia' },
                      { case: { $eq: ['$payments.paymentType', 'STRIPE'] }, then: 'Crédito/Débito' },
                      { case: { $eq: ['$payments.paymentType', 'MERCADOPAGO'] }, then: 'Mercado Pago' },
                      { case: { $eq: ['$payments.paymentType', 'PAYPAL'] }, then: 'PayPal' }
                    ],
                    default: 'Otro'
                  }
                },
                revenue: { $sum: '$payments.amount' }
              }
            }
          ],
          // Caso 2: Reservas sin payments pero con totalPaid > 0 (retrocompatibilidad)
          // Mapear los nombres del catálogo a los mismos nombres que usamos arriba
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
              $addFields: {
                normalizedPaymentMethod: {
                  $switch: {
                    branches: [
                      // Mapear nombres del catálogo a nombres consistentes
                      { 
                        case: { 
                          $regexMatch: { 
                            input: { $ifNull: ['$paymentMethodData.name', ''] }, 
                            regex: /efectivo/i 
                          } 
                        }, 
                        then: 'Efectivo' 
                      },
                      { 
                        case: { 
                          $regexMatch: { 
                            input: { $ifNull: ['$paymentMethodData.name', ''] }, 
                            regex: /transferencia/i 
                          } 
                        }, 
                        then: 'Transferencia' 
                      },
                      { 
                        case: { 
                          $regexMatch: { 
                            input: { $ifNull: ['$paymentMethodData.name', ''] }, 
                            regex: /(credito|debito|tarjeta|stripe)/i 
                          } 
                        }, 
                        then: 'Crédito/Débito' 
                      },
                      { 
                        case: { 
                          $regexMatch: { 
                            input: { $ifNull: ['$paymentMethodData.name', ''] }, 
                            regex: /mercado.*pago/i 
                          } 
                        }, 
                        then: 'Mercado Pago' 
                      },
                      { 
                        case: { 
                          $regexMatch: { 
                            input: { $ifNull: ['$paymentMethodData.name', ''] }, 
                            regex: /paypal/i 
                          } 
                        }, 
                        then: 'PayPal' 
                      }
                    ],
                    default: 'Otro'
                  }
                }
              }
            },
            {
              $group: {
                _id: '$normalizedPaymentMethod',
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

  async getPaymentMediumRevenue(filters?: MetricsFilters): Promise<PaymentMediumRevenue[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    
    // Obtener IDs de status APROBADAS y COMPLETADAS
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);

    if (statusIds.length === 0) {
      this.logger.warn(`[getPaymentMediumRevenue] Status '${BOOKING_STATUS.APPROVED}' o '${BOOKING_STATUS.COMPLETED}' no encontrados`);
      return [];
    }

    // Filtrar por createdAt de la reserva para consistencia
    const matchStage: any = { 
      status: { $in: statusIds },
      ...(dateFilter && { createdAt: dateFilter }),
      totalPaid: { $gt: 0 }
    };
    
    // CORRECCIÓN: El medio de pago está en booking.metadata.paymentMedium
    // IMPORTANTE: NO usar fallback - solo mostrar reservas que tienen metadata.paymentMedium
    // Las reservas sin metadata.paymentMedium aparecerán en "Ingresos por Método de Pago"
    const bookings = await this.bookingModel.find(matchStage).select('payments totalPaid metadata').lean();
    
    const mediumRevenue = new Map<string, number>();
    
    for (const booking of bookings) {
      const payments = (booking as any).payments || [];
      
      // SOLO procesar si tiene metadata.paymentMedium (medios específicos como ZELLE, CLIP, etc.)
      const paymentMedium = (booking as any).metadata?.paymentMedium;
      
      if (!paymentMedium) {
        // Sin medio de pago específico - esta reserva aparecerá en "Método de Pago"
        continue;
      }
      
      if (payments.length > 0) {
        // Sumar todos los pagos PAID de esta reserva
        for (const payment of payments) {
          if (payment.status === 'PAID') {
            const existing = mediumRevenue.get(paymentMedium);
            mediumRevenue.set(paymentMedium, (existing || 0) + payment.amount);
          }
        }
      } else if ((booking as any).totalPaid > 0) {
        // Reservas antiguas sin payments - usar totalPaid
        const existing = mediumRevenue.get(paymentMedium);
        mediumRevenue.set(paymentMedium, (existing || 0) + (booking as any).totalPaid);
      }
    }
    
    // Convertir a array y ordenar por revenue descendente
    const result = Array.from(mediumRevenue.entries()).map(([medium, revenue]) => ({
      paymentMediumId: medium,
      paymentMediumName: medium,
      revenue
    })).sort((a, b) => b.revenue - a.revenue);
    
    return result;
  }

  async getCategoryUtilization(filters?: MetricsFilters): Promise<CategoryUtilization[]> {
    const dateFilter = this.buildDateFilter(filters?.dateFilter);
    const statusIds = await this.getApprovedStatusIds();

    // 1. Obtener conteo de vehículos por categoría en UNA consulta
    const vehicleCountMatch: any = {
      isActive: true
    };
    
    // Si hay filtro de vehicleType, agregar filtro con $in
    if (filters?.vehicleType && filters.vehicleType.length > 0) {
      const categories = await this.categoryModel.find({ name: { $in: filters.vehicleType } }).select('_id').lean();
      const categoryIds = categories.map(c => c._id);
      if (categoryIds.length > 0) {
        vehicleCountMatch.category = { $in: categoryIds };
      }
    }
    
    const vehicleCountPipeline: any[] = [
      {
        $match: vehicleCountMatch
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

    // 4. Construir resultado
    const utilizations: CategoryUtilization[] = [];

    for (const [categoryId, categoryData] of categoryMap.entries()) {
      // Calcular porcentaje de utilización basado en vehículos disponibles vs bookings
      // Si hay 10 vehículos y 5 bookings, la utilización es 50%
      const utilizationPercentage = categoryData.totalVehicles > 0 
        ? (categoryData.count / categoryData.totalVehicles) * 100 
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
              // Aplicar filtro de tipo de vehículo si existe (ahora soporta arrays)
              if (filters?.vehicleType && filters.vehicleType.length > 0) {
                const vehicle = await this.vehicleModel.findById(vehicleItem.vehicle).populate('category');
                if (!vehicle || !filters.vehicleType.includes((vehicle.category as any).name)) {
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
              // Aplicar filtro de tipo si existe (ahora soporta arrays)
              if (filters?.vehicleType && filters.vehicleType.length > 0) {
                const categoryName = tourItem.tour.category?.name;
                if (!categoryName || !filters.vehicleType.includes(categoryName)) {
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
              // Aplicar filtro de tipo si existe (ahora soporta arrays)
              if (filters?.vehicleType && filters.vehicleType.length > 0) {
                const categoryName = transferItem.transfer.category?.name;
                if (!categoryName || !filters.vehicleType.includes(categoryName)) {
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
              // Aplicar filtro de tipo si existe (ahora soporta arrays)
              if (filters?.vehicleType && filters.vehicleType.length > 0) {
                const categoryName = ticketItem.ticket.category?.name;
                if (!categoryName || !filters.vehicleType.includes(categoryName)) {
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

        // Aplicar filtro de tipo de vehículo si existe (ahora soporta arrays)
        if (filters?.vehicleType && filters.vehicleType.length > 0 && !filters.vehicleType.includes(category.name)) {
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

  /**
   * Calcula la proporción de uso de un vehículo en una renta cuando hay cambios de vehículos
   * @param contractId ID del contrato
   * @param vehicleId ID del vehículo a analizar
   * @param currentCart Carrito actual del booking
   * @returns Información sobre la proporción de uso del vehículo
   */
  private async getVehicleChangeProportions(
    contractId: string,
    vehicleId: string,
    currentCart: any
  ): Promise<{ proportion: number; vehicleTotal: number; dates: { start: Date; end: Date } } | null> {
    try {
      // Buscar el evento de "CAMBIO DE VEHICULO" en el catálogo
      const vehicleChangeEvent = await this.catContractEventModel.findOne({ name: 'CAMBIO DE VEHICULO' }).lean();
      
      if (!vehicleChangeEvent) {
        return null;
      }
      
      // Buscar cambios de vehículo en el historial del contrato
      const vehicleChangeEventId = (vehicleChangeEvent as any)._id;
      const vehicleChanges = await this.contractHistoryModel.find({
        contract: new mongoose.Types.ObjectId(contractId),
        eventType: vehicleChangeEventId,
        isDeleted: { $ne: true }
      }).sort({ createdAt: 1 }).lean();
      
      if (vehicleChanges.length === 0) {
        // No hay cambios de vehículo, el vehículo estuvo toda la renta
        return null;
      }
      
      // Obtener las fechas totales de la renta desde el carrito actual
      let rentalStartDate: Date | null = null;
      let rentalEndDate: Date | null = null;
      
      if (currentCart.vehicles && Array.isArray(currentCart.vehicles) && currentCart.vehicles.length > 0) {
        const firstVehicle = currentCart.vehicles[0];
        if (firstVehicle.dates?.start && firstVehicle.dates?.end) {
          rentalStartDate = new Date(firstVehicle.dates.start);
          rentalEndDate = new Date(firstVehicle.dates.end);
        }
      }
      
      if (!rentalStartDate || !rentalEndDate) {
        this.logger.warn(`[getVehicleChangeProportions] No se pudieron obtener las fechas de la renta para el contrato ${contractId}`);
        return null;
      }
      
      // Calcular la duración total de la renta en días
      const totalRentalDays = (rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (totalRentalDays <= 0) {
        return null;
      }
      
      // Analizar los cambios para determinar qué vehículo estuvo en qué período
      let vehicleStartDate: Date | null = null;
      let vehicleEndDate: Date | null = null;
      let vehicleTotal = 0;
      
      // Recorrer los cambios de vehículo para encontrar los períodos de cada vehículo
      for (let i = 0; i < vehicleChanges.length; i++) {
        const change = vehicleChanges[i];
        const changeDate = new Date((change as any).createdAt);
        
        // Verificar si este cambio involucra al vehículo que estamos analizando
        const changes = (change as any).changes || [];
        
        for (const changeDetail of changes) {
          if (changeDetail.field === 'booking.cart.vehicles') {
            const oldVehicles = changeDetail.oldValue || [];
            const newVehicles = changeDetail.newValue || [];
            
            // Verificar si el vehículo estaba en oldValue (fue removido)
            const wasInOld = oldVehicles.some((v: any) => {
              const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
              return vId === vehicleId;
            });
            
            // Verificar si el vehículo está en newValue (fue agregado)
            const isInNew = newVehicles.some((v: any) => {
              const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
              return vId === vehicleId;
            });
            
            if (wasInOld && !isInNew) {
              // El vehículo fue removido en este cambio
              vehicleStartDate = rentalStartDate;
              vehicleEndDate = changeDate;
              
              // Obtener el total del vehículo desde oldValue
              const vehicleInOld = oldVehicles.find((v: any) => {
                const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
                return vId === vehicleId;
              });
              
              if (vehicleInOld) {
                vehicleTotal = vehicleInOld.total || 0;
              }
            } else if (!wasInOld && isInNew) {
              // El vehículo fue agregado en este cambio
              vehicleStartDate = changeDate;
              vehicleEndDate = rentalEndDate;
              
              // Obtener el total del vehículo desde newValue
              const vehicleInNew = newVehicles.find((v: any) => {
                const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
                return vId === vehicleId;
              });
              
              if (vehicleInNew) {
                vehicleTotal = vehicleInNew.total || 0;
              }
            }
          }
        }
      }
      
      // Si no encontramos el vehículo en los cambios, verificar si está en el carrito actual
      if (!vehicleStartDate && !vehicleEndDate) {
        // Verificar si el vehículo está en el carrito actual
        if (currentCart.vehicles && Array.isArray(currentCart.vehicles)) {
          const vehicleInCurrent = currentCart.vehicles.find((v: any) => {
            const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
            return vId === vehicleId;
          });
          
          if (vehicleInCurrent) {
            // El vehículo está en el carrito actual, determinar desde cuándo
            // Si hay cambios, el vehículo fue agregado en el último cambio
            if (vehicleChanges.length > 0) {
              const lastChange = vehicleChanges[vehicleChanges.length - 1];
              vehicleStartDate = new Date((lastChange as any).createdAt);
              vehicleEndDate = rentalEndDate;
              vehicleTotal = vehicleInCurrent.total || 0;
            } else {
              // No hay cambios, el vehículo estuvo toda la renta
              return null;
            }
          }
        }
      }
      
      if (!vehicleStartDate || !vehicleEndDate) {
        // No se pudo determinar el período del vehículo
        return null;
      }
      
      // Calcular la duración que el vehículo estuvo en uso (en días)
      const vehicleDays = (vehicleEndDate.getTime() - vehicleStartDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Calcular la proporción
      const proportion = vehicleDays / totalRentalDays;
      
      this.logger.debug(`[getVehicleChangeProportions] Vehículo ${vehicleId}: ` +
        `${vehicleDays.toFixed(2)} días de ${totalRentalDays.toFixed(2)} días totales = ${(proportion * 100).toFixed(2)}%`);
      
      return {
        proportion: Math.max(0, Math.min(1, proportion)), // Asegurar que esté entre 0 y 1
        vehicleTotal,
        dates: {
          start: vehicleStartDate,
          end: vehicleEndDate
        }
      };
    } catch (error) {
      this.logger.error(`[getVehicleChangeProportions] Error al calcular proporciones para vehículo ${vehicleId}:`, error);
      return null;
    }
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

      // Si hay filtro de vehicleType, primero obtener los bookings que coincidan
      let bookingIdsToInclude: Set<string> | null = null;
      
      if (filters?.vehicleType && filters.vehicleType.length > 0) {
        // Obtener categorías filtradas
        const categories = await this.categoryModel.find({ name: { $in: filters.vehicleType } }).select('_id').lean();
        const categoryIds = new Set(categories.map(c => c._id.toString()));
        
        // Obtener vehículos de esas categorías
        const vehiclesInCategory = await this.vehicleModel.find({ category: { $in: Array.from(categoryIds) } }).select('_id').lean();
        const vehicleIdsInCategory = new Set(vehiclesInCategory.map(v => v._id.toString()));
        
        // Obtener todos los bookings y filtrar por cart
        const allBookings = await this.bookingModel.find({
          status: { $in: statusIds },
          ...(dateFilter && { createdAt: dateFilter }),
          totalPaid: { $gt: 0 }
        }).select('_id cart').lean();
        
        bookingIdsToInclude = new Set<string>();
        
        for (const booking of allBookings) {
          try {
            const cart = JSON.parse((booking as any).cart);
            let hasMatchingItem = false;
            
            // Verificar vehículos
            if (cart.vehicles && Array.isArray(cart.vehicles)) {
              for (const vehicleItem of cart.vehicles) {
                const vehicleId = vehicleItem.vehicle?._id?.toString() || vehicleItem.vehicle?.toString();
                if (vehicleId && vehicleIdsInCategory.has(vehicleId)) {
                  hasMatchingItem = true;
                  break;
                }
              }
            }
            
            // Verificar tours
            if (!hasMatchingItem && cart.tours && Array.isArray(cart.tours)) {
              for (const tourItem of cart.tours) {
                const categoryName = tourItem.tour?.category?.name;
                if (categoryName && filters.vehicleType.includes(categoryName)) {
                  hasMatchingItem = true;
                  break;
                }
              }
            }
            
            // Verificar transfers
            if (!hasMatchingItem && cart.transfer && Array.isArray(cart.transfer)) {
              for (const transferItem of cart.transfer) {
                const categoryName = transferItem.transfer?.category?.name;
                if (categoryName && filters.vehicleType.includes(categoryName)) {
                  hasMatchingItem = true;
                  break;
                }
              }
            }
            
            // Verificar tickets
            if (!hasMatchingItem && cart.tickets && Array.isArray(cart.tickets)) {
              for (const ticketItem of cart.tickets) {
                const categoryName = ticketItem.ticket?.category?.name;
                if (categoryName && filters.vehicleType.includes(categoryName)) {
                  hasMatchingItem = true;
                  break;
                }
              }
            }
            
            if (hasMatchingItem) {
              bookingIdsToInclude.add((booking as any)._id.toString());
            }
          } catch (error) {
            // Ignorar errores de parsing
          }
        }
        
        this.logger.debug(`[getTransactionDetails] Filtrado por vehicleType: ${bookingIdsToInclude.size} bookings de ${allBookings.length} coinciden`);
      }

      // CAMBIO: Filtrar por createdAt de la reserva en lugar de paymentDate
      // Esto asegura que los ingresos se muestren según la fecha de creación de la reserva
      // que es consistente con el listado de reservas
      
      // IMPORTANTE: Manejar dos casos:
      // 1. Reservas con array payments poblado
      // 2. Reservas con totalPaid > 0 pero payments vacío (reservas antiguas o migradas)
      
      const matchStage: any = {
        status: { $in: statusIds },
        ...(dateFilter && { createdAt: dateFilter }),
        totalPaid: { $gt: 0 }
      };
      
      // Si hay filtro de vehicleType, agregar filtro de IDs
      if (bookingIdsToInclude) {
        if (bookingIdsToInclude.size === 0) {
          // No hay bookings que coincidan, no crear transacciones
          // combinedTransactions ya está vacío
        } else {
          matchStage._id = { $in: Array.from(bookingIdsToInclude).map(id => new mongoose.Types.ObjectId(id)) };
        }
      }
      
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
        cart: 1, // Necesitamos el cart para extraer los servicios
        metadata: 1, // Necesitamos metadata para obtener el medio de pago
        paymentMethod: 1, // Necesitamos el paymentMethod del booking como fallback
        // Verificar que payments sea un array Y tenga elementos
        hasPayments: {
        $and: [
        { $isArray: '$payments' },
        { $gt: [{ $size: '$payments' }, 0] }
        ]
        }
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
            $addFields: {
            'payments.paymentMethodObjectId': {
            $cond: {
            if: { $eq: [{ $type: '$payments.paymentMethod' }, 'objectId'] },
            then: '$payments.paymentMethod',
            else: {
            $cond: {
            if: { 
            $regexMatch: { 
            input: { $toString: '$payments.paymentMethod' }, 
            regex: '^[0-9a-fA-F]{24}$' 
            } 
            },
            then: { $toObjectId: '$payments.paymentMethod' },
            else: null
            }
            }
            }
            },
            'payments.paymentMethodString': {
            $cond: {
            if: { 
            $not: { 
            $regexMatch: { 
            input: { $toString: '$payments.paymentMethod' }, 
            regex: '^[0-9a-fA-F]{24}$' 
            } 
            } 
            },
            then: { $toString: '$payments.paymentMethod' },
            else: null
            }
            }
            }
            },
            {
            $lookup: {
            from: 'cat_payment_method',
            localField: 'payments.paymentMethodObjectId',
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
            $lookup: {
            from: 'cat_payment_method',
            localField: 'paymentMethod',
            foreignField: '_id',
            as: 'bookingPaymentMethodData'
            }
            },
            {
            $unwind: {
            path: '$bookingPaymentMethodData',
            preserveNullAndEmptyArrays: true
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
            paymentType: '$payments.paymentType',
            paymentMethod: '$payments.paymentType',
            paymentMedium: {
            $ifNull: [
            '$metadata.paymentMedium',
            {
            $switch: {
            branches: [
            { case: { $eq: ['$payments.paymentType', 'STRIPE'] }, then: 'Crédito/Débito' },
            { case: { $eq: ['$payments.paymentType', 'MERCADOPAGO'] }, then: 'Mercado Pago' },
            { case: { $eq: ['$payments.paymentType', 'PAYPAL'] }, then: 'PayPal' },
            { case: { $eq: ['$payments.paymentType', 'CASH'] }, then: 'Efectivo' },
            { case: { $eq: ['$payments.paymentType', 'TRANSFER'] }, then: 'Transferencia' }
            ],
            default: { $ifNull: ['$bookingPaymentMethodData.name', 'N/A'] }
            }
            }
            ]
            },
            cart: '$cart' // Pasar el cart para procesarlo después
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
            paymentType: { $literal: 'N/A' },
            paymentMethod: { $literal: 'N/A' },
            paymentMedium: {
            $ifNull: [
            '$metadata.paymentMedium',
            '$paymentMethodData.name',
            'N/A'
            ]
            },
            cart: '$cart' // Pasar el cart para procesarlo después
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
      $lookup: {
      from: 'vehicle',
      localField: 'vehicle',
      foreignField: '_id',
      as: 'vehicleData'
      }
      },
      {
      $unwind: {
      path: '$vehicleData',
      preserveNullAndEmptyArrays: true
      }
      },
      {
      $project: {
      _id: 0,
      type: { $literal: 'EXPENSE' },
      date: '$date',
      amount: '$amount',
      description: '$detail',
      sourceId: '$_id',
      movementType: '$type',
      services: {
      $cond: {
      if: '$vehicleData',
      then: { $ifNull: ['$vehicleData.name', '$vehicleData.tag'] },
      else: 'N/A'
      }
      },
      // CORRECCIÓN: Usar paymentMethod del movement en lugar de metadata.paymentMedium
      // El paymentMethod es un enum que contiene valores como 'EFECTIVO', 'TRANSFERENCIA', etc.
      paymentMedium: { $ifNull: ['$paymentMethod', 'N/A'] }
      }
      }
      ];
      const expenseDetails = await this.movementModel.aggregate(expensePipeline);
      combinedTransactions.push(...expenseDetails);
    }

        
    // --- POST-PROCESAMIENTO: Extraer servicios del cart para INGRESOS ---
    for (const transaction of combinedTransactions) {
      if (transaction.type === 'INCOME' && (transaction as any).cart) {
        // Para INGRESOS: Extraer servicios del cart
        try {
          const cart = JSON.parse((transaction as any).cart);
          const services: string[] = [];
          
          // Vehículos - Priorizar name (que contiene el tag corto como S-13)
          if (cart.vehicles && Array.isArray(cart.vehicles)) {
            services.push(...cart.vehicles.map((v: any) => v.vehicle?.name || v.vehicle?.tag || 'Vehículo'));
          }
          
          // Tours
          if (cart.tours && Array.isArray(cart.tours)) {
            services.push(...cart.tours.map((t: any) => `${t.tour?.name || 'Tour'} (x${t.quantity || 1})`));
          }
          
          // Transfers
          if (cart.transfer && Array.isArray(cart.transfer)) {
            services.push(...cart.transfer.map((t: any) => `${t.transfer?.name || 'Transfer'} (x${t.quantity || 1})`));
          }
          
          // Tickets
          if (cart.tickets && Array.isArray(cart.tickets)) {
            services.push(...cart.tickets.map((t: any) => `${t.ticket?.name || 'Ticket'} (x${t.quantity || 1})`));
          }
          
          transaction.services = services.length > 0 ? services.join(', ') : 'N/A';
          delete (transaction as any).cart; // Eliminar el cart del resultado final
        } catch (error) {
          transaction.services = 'N/A';
          delete (transaction as any).cart;
        }
      } else if (!transaction.services) {
        // Si no tiene services (por algún error), asignar N/A
        transaction.services = 'N/A';
        delete (transaction as any).cart;
      }
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

  async exportOwnerReport(ownerId: string, vehicleId: string | undefined, filters: MetricsFilters, utilityPercentage: number): Promise<any> {
    const XLSX = require('xlsx');
    
    this.logger.log(`[exportOwnerReport] Generando reporte para propietario ${ownerId}`);
    
    // 1. Obtener información del propietario
    const owner = await this.vehicleOwnerModel.findById(ownerId).lean();
    
    if (!owner || Array.isArray(owner)) {
    throw new Error('Propietario no encontrado');
    }
    
    // 2. Obtener vehículos del propietario
    let vehiclesToProcess: any[] = [];
    
    if (vehicleId) {
      // Filtrar por vehículo específico
      const vehicle = await this.vehicleModel.findById(vehicleId).lean();
      if (vehicle && vehicle.owner?.toString() === ownerId) {
        vehiclesToProcess = [vehicle];
      }
    } else {
      // Obtener todos los vehículos del propietario
      vehiclesToProcess = await this.vehicleModel.find({ 
        owner: new mongoose.Types.ObjectId(ownerId),
        isDeleted: { $ne: true }
      }).lean();
    }
    
    if (vehiclesToProcess.length === 0) {
      throw new Error('No se encontraron vehículos para este propietario');
    }
    
    this.logger.log(`[exportOwnerReport] Procesando ${vehiclesToProcess.length} vehículos`);
    
    // 3. Obtener transacciones detalladas para cada vehículo Y datos completos de reservas
    const allVehicleData: any[] = [];
    const allIncomeTransactions: any[] = [];
    const allExpenseTransactions: any[] = [];
    const allBookingsData: any[] = []; // Nueva estructura para datos completos de reservas
    
    // Obtener estados APROBADAS y COMPLETADAS
    const approvedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.APPROVED });
    const completedStatus = await this.statusModel.findOne({ name: BOOKING_STATUS.COMPLETED });
    const statusIds = [];
    if (approvedStatus) statusIds.push(approvedStatus._id);
    if (completedStatus) statusIds.push(completedStatus._id);
    
    for (const vehicle of vehiclesToProcess) {
    const transactions = await this.getVehicleFinancialDetails(vehicle._id.toString(), filters);
    
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
    
    // Agrupar transacciones de ingreso por sourceId (reserva) para contar reservas únicas
    const uniqueBookings = new Set<string>();
    const bookingDetails = new Map<string, any>();
    
    for (const transaction of incomeTransactions) {
    if (!transaction.description.includes('Extensión')) {
    uniqueBookings.add(transaction.sourceId);
    
    if (!bookingDetails.has(transaction.sourceId)) {
    bookingDetails.set(transaction.sourceId, {
    bookingId: transaction.sourceId,
    transactions: [],
    totalAmount: 0
    });
    }
    
    const detail = bookingDetails.get(transaction.sourceId);
    detail.transactions.push(transaction);
    detail.totalAmount += transaction.amount;
    }
    }
    
    // NUEVO: Obtener información completa de las reservas
    const bookingIds = Array.from(uniqueBookings);
    if (bookingIds.length > 0) {
    const bookings = await this.bookingModel.find({
    _id: { $in: bookingIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();
    
    // Obtener contratos para obtener información del usuario
    const contracts = await this.contractModel.find({
    booking: { $in: bookingIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('reservingUser').lean();
    
    // Crear un mapa de booking -> usuario
    const bookingUserMap = new Map();
    for (const contract of contracts) {
    bookingUserMap.set((contract as any).booking.toString(), (contract as any).reservingUser);
    }
    
    for (const booking of bookings) {
    try {
    const cart = JSON.parse((booking as any).cart);
    const payments = (booking as any).payments || [];
    
    // Encontrar el vehículo en el carrito actual O en el historial
    let vehicleInCart = null;
    let vehicleDates = null;
    let vehicleTotal = 0;
    let isOldVehicle = false;
    
    // 1. Buscar en el carrito actual
    if (cart.vehicles && Array.isArray(cart.vehicles)) {
    vehicleInCart = cart.vehicles.find((v: any) => {
    const vId = v.vehicle?._id?.toString() || v.vehicle?.toString();
    return vId === vehicle._id.toString();
    });
    
    if (vehicleInCart) {
    vehicleDates = vehicleInCart.dates;
    vehicleTotal = vehicleInCart.total || 0;
    }
    }
    
    // 2. Si no está en el carrito actual, buscar en el historial (vehículos removidos)
    if (!vehicleInCart) {
    const contract = contracts.find((c: any) => c.booking.toString() === (booking as any)._id.toString());
    if (contract) {
    const snapshots = (contract as any).snapshots || [];
    
    for (const snapshot of snapshots) {
    const changes = snapshot.changes || [];
    for (const change of changes) {
    if (change.field === 'booking.cart.vehicles') {
    const oldVehicles = change.oldValue || [];
    
    for (const oldVehicleItem of oldVehicles) {
    const oldVehicleId = oldVehicleItem.vehicle?._id?.toString() || oldVehicleItem.vehicle?.toString();
    if (oldVehicleId === vehicle._id.toString()) {
    vehicleInCart = oldVehicleItem;
    isOldVehicle = true;
    vehicleDates = oldVehicleItem.dates;
    vehicleTotal = oldVehicleItem.total || 0;
    break;
    }
    }
    }
    if (vehicleInCart) break;
    }
    if (vehicleInCart) break;
    }
    }
    }
    
    // Calcular días de renta
    let rentalDays = 0;
    if (vehicleDates?.start && vehicleDates?.end) {
    const start = new Date(vehicleDates.start);
    const end = new Date(vehicleDates.end);
    rentalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Obtener información del cliente desde el contrato
    const user = bookingUserMap.get((booking as any)._id.toString());
    const clientName = user ? `${user.name || ''} ${user.lastName || ''}`.trim() : 'N/A';
    const clientEmail = user?.email || 'N/A';
    const clientPhone = user?.phone || 'N/A';
    
    // CORRECCIÓN: Filtrar pagos duplicados (validaciones manuales del mismo pago)
    // Agrupar pagos por monto y considerar solo el primero de cada grupo
    const uniquePayments = new Map<number, any>();
    for (const payment of payments) {
    if (payment.status === 'PAID') {
    const amount = payment.amount || 0;
    if (!uniquePayments.has(amount)) {
    uniquePayments.set(amount, payment);
    }
    }
    }
    
    // Calcular total pagado de esta reserva (sin duplicados)
    const totalPaid = Array.from(uniquePayments.values())
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    // Obtener método de pago
    const paymentMethod = payments.length > 0 
    ? payments[0].paymentType || 'N/A'
    : 'N/A';
    
    allBookingsData.push({
    bookingNumber: (booking as any).bookingNumber,
    bookingId: (booking as any)._id.toString(),
    vehicleName: vehicle.name,
    vehicleTag: vehicle.tag,
    clientName,
    clientEmail,
    clientPhone,
    startDate: vehicleDates?.start ? new Date(vehicleDates.start) : null,
    endDate: vehicleDates?.end ? new Date(vehicleDates.end) : null,
    rentalDays,
    vehicleTotal,
    totalPaid,
    paymentMethod,
    createdAt: new Date((booking as any).createdAt),
    status: (booking as any).status,
    payments: payments.map((p: any) => ({
    amount: p.amount,
    status: p.status,
    paymentType: p.paymentType,
    paymentDate: p.paymentDate
    }))
    });
    } catch (error) {
    this.logger.warn(`Error al procesar booking ${(booking as any)._id}:`, error);
    }
    }
    }
    
    const rentalDays = uniqueBookings.size;
    const income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const expenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const net = income - expenses;
    
    allVehicleData.push({
    vehicleId: vehicle._id.toString(),
    vehicleName: vehicle.name,
    vehicleTag: vehicle.tag,
    rentalDays,
    income,
    expenses,
    net,
    incomeTransactions,
    expenseTransactions,
    bookingDetails: Array.from(bookingDetails.values())
    });
    
    // Agregar a las listas globales
    allIncomeTransactions.push(...incomeTransactions.map(t => ({
    ...t,
    vehicleName: vehicle.name,
    vehicleTag: vehicle.tag
    })));
    allExpenseTransactions.push(...expenseTransactions.map(t => ({
    ...t,
    vehicleName: vehicle.name,
    vehicleTag: vehicle.tag
    })));
    }
    
    // 4. Calcular totales
    const totalRentalDays = allVehicleData.reduce((sum, v) => sum + v.rentalDays, 0);
    const totalIncome = allVehicleData.reduce((sum, v) => sum + v.income, 0);
    const totalExpenses = allVehicleData.reduce((sum, v) => sum + v.expenses, 0);
    const totalNet = totalIncome - totalExpenses;
    const utilityValue = totalNet * (utilityPercentage / 100);
    
    // 5. Crear el libro de Excel
    const workbook = XLSX.utils.book_new();
    
    // HOJA 1: Resumen General
    const summaryData = [
      ['REPORTE DE PROPIETARIO'],
      [],
      ['Propietario:', (owner as any).name],
      ['Período:', this.getDateRangeLabel(filters)],
      ['Fecha de generación:', new Date().toLocaleString('es-ES')],
      [],
      ['RESUMEN FINANCIERO'],
      ['Concepto', 'Valor'],
      ['Total Ventas', `${totalIncome.toFixed(2)}`],
      ['Total Gastos', `${totalExpenses.toFixed(2)}`],
      ['Total Neto', `${totalNet.toFixed(2)}`],
      ['Porcentaje de Utilidad', `${utilityPercentage}%`],
      ['Utilidad Calculada', `${utilityValue.toFixed(2)}`],
      [],
      ['RESUMEN POR VEHÍCULO'],
      ['Vehículo', 'Días de Renta', 'Ventas', 'Gastos', 'Neto']
    ];
    
    // Agregar datos de cada vehículo
    for (const vehicleData of allVehicleData) {
      summaryData.push([
        vehicleData.vehicleName,
        vehicleData.rentalDays,
        `${vehicleData.income.toFixed(2)}`,
        `${vehicleData.expenses.toFixed(2)}`,
        `${vehicleData.net.toFixed(2)}`
      ]);
    }
    
    // Agregar fila de totales
    summaryData.push([
      'TOTAL',
      totalRentalDays,
      `${totalIncome.toFixed(2)}`,
      `${totalExpenses.toFixed(2)}`,
      `${totalNet.toFixed(2)}`
    ]);
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    
    // HOJA 2: Detalle Completo de Reservas
    const bookingsDetailData = [
    ['DETALLE COMPLETO DE RESERVAS'],
    [],
    ['N° Reserva', 'Vehículo',, 'Cliente', 'Email', 'Teléfono', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Monto Vehículo', 'Total Pagado', 'Método Pago', 'Fecha Creación']
    ];
    
    // Ordenar reservas por fecha de creación descendente
    allBookingsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    for (const booking of allBookingsData) {
    bookingsDetailData.push([
    booking.bookingNumber || 'N/A',
    booking.vehicleName,
    
    booking.clientName,
    booking.clientEmail,
    booking.clientPhone,
    booking.startDate ? booking.startDate.toLocaleDateString('es-ES') : 'N/A',
    booking.endDate ? booking.endDate.toLocaleDateString('es-ES') : 'N/A',
    booking.rentalDays,
    booking.vehicleTotal.toFixed(2),
    booking.totalPaid.toFixed(2),
    booking.paymentMethod,
    booking.createdAt.toLocaleString('es-ES')
    ]);
    }
    
    // Agregar totales
    const totalVehicleAmount = allBookingsData.reduce((sum, b) => sum + b.vehicleTotal, 0);
    const totalPaidAmount = allBookingsData.reduce((sum, b) => sum + b.totalPaid, 0);
    const totalDays = allBookingsData.reduce((sum, b) => sum + b.rentalDays, 0);
    
    bookingsDetailData.push([]);
    bookingsDetailData.push([
    'TOTALES',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalDays,
    totalVehicleAmount.toFixed(2),
    totalPaidAmount.toFixed(2),
    '',
    ''
    ]);
    
    const bookingsSheet = XLSX.utils.aoa_to_sheet(bookingsDetailData);
    XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'Detalle de Reservas');
    
    // HOJA 3: Pagos por Reserva
    const paymentsDetailData = [
    ['DETALLE DE PAGOS POR RESERVA'],
    [],
    ['N° Reserva', 'Vehículo', 'Cliente', 'Monto Pago', 'Estado', 'Tipo Pago', 'Fecha Pago']
    ];
    
    for (const booking of allBookingsData) {
    if (booking.payments && booking.payments.length > 0) {
    for (const payment of booking.payments) {
    paymentsDetailData.push([
    booking.bookingNumber || 'N/A',
    booking.vehicleName,
    booking.clientName,
    payment.amount ? payment.amount.toFixed(2) : '0.00',
    payment.status || 'N/A',
    payment.paymentType || 'N/A',
    payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('es-ES') : 'N/A'
    ]);
    }
    } else {
    // Si no hay pagos en el array, mostrar el total pagado
    paymentsDetailData.push([
    booking.bookingNumber || 'N/A',
    booking.vehicleName,
    booking.clientName,
    booking.totalPaid.toFixed(2),
    'PAID',
    booking.paymentMethod,
    booking.createdAt.toLocaleString('es-ES')
    ]);
    }
    }
    
    const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsDetailData);
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Detalle de Pagos');
    
    // HOJA 4: Detalle de Ingresos por Transacción
    const incomeDetailData = [
    ['DETALLE DE INGRESOS POR TRANSACCIÓN'],
    [],
    ['Vehículo',, 'N° Reserva', 'Fecha Transacción', 'Descripción', 'Monto']
    ];
    
    // Ordenar por fecha descendente
    allIncomeTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const transaction of allIncomeTransactions) {
    const bookingNumber = transaction.description.match(/#(\d+)/)?.[1] || 'N/A';
    
    incomeDetailData.push([
    transaction.vehicleName,
    
    bookingNumber,
    new Date(transaction.date).toLocaleString('es-ES'),
    transaction.description,
    transaction.amount.toFixed(2)
    ]);
    }
    
    // Agregar total
    incomeDetailData.push([]);
    incomeDetailData.push(['', '', '', '', 'TOTAL INGRESOS', totalIncome.toFixed(2)]);
    
    const incomeSheet = XLSX.utils.aoa_to_sheet(incomeDetailData);
    XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Detalle de Ingresos');
    
    // HOJA 5: Detalle de Gastos
    const expenseDetailData = [
    ['DETALLE DE GASTOS'],
    [],
    ['Vehículo',, 'Fecha', 'Descripción', 'Monto']
    ];
    
    // Ordenar gastos por fecha descendente
    allExpenseTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const transaction of allExpenseTransactions) {
    expenseDetailData.push([
    transaction.vehicleName,
    
    new Date(transaction.date).toLocaleString('es-ES'),
    transaction.description,
    transaction.amount.toFixed(2)
    ]);
    }
    
    // Agregar total
    expenseDetailData.push([]);
    expenseDetailData.push(['', '', '', 'TOTAL GASTOS', totalExpenses.toFixed(2)]);
    
    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseDetailData);
    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Detalle de Gastos');
    
    // HOJA 6: Resumen por Vehículo Detallado
    const vehicleSummaryData = [
    ['RESUMEN DETALLADO POR VEHÍCULO'],
    [],
    ['Vehículo',, 'N° Reservas', 'Días Totales', 'Ingresos', 'Gastos', 'Neto', 'Margen %']
    ];
    
    for (const vehicleData of allVehicleData) {
    const margin = vehicleData.income > 0 
    ? ((vehicleData.net / vehicleData.income) * 100).toFixed(2)
    : '0.00';
    
    vehicleSummaryData.push([
    vehicleData.vehicleName,
    
    vehicleData.rentalDays,
    vehicleData.rentalDays, // Días totales = número de reservas en este contexto
    vehicleData.income.toFixed(2),
    vehicleData.expenses.toFixed(2),
    vehicleData.net.toFixed(2),
    `${margin}%`
    ]);
    }
    
    // Totales
    const totalMargin = totalIncome > 0 
    ? ((totalNet / totalIncome) * 100).toFixed(2)
    : '0.00';
    
    vehicleSummaryData.push([]);
    vehicleSummaryData.push([
    'TOTAL',
    '',
    totalRentalDays,
    totalRentalDays,
    totalIncome.toFixed(2),
    totalExpenses.toFixed(2),
    totalNet.toFixed(2),
    `${totalMargin}%`
    ]);
    
    const vehicleSummarySheet = XLSX.utils.aoa_to_sheet(vehicleSummaryData);
    XLSX.utils.book_append_sheet(workbook, vehicleSummarySheet, 'Resumen por Vehículo');
    
    // HOJA 7: Todas las Transacciones (Libro Mayor)
    const allTransactionsData = [
    ['LIBRO MAYOR - TODAS LAS TRANSACCIONES'],
    [],
    ['Fecha', 'Tipo', 'Vehículo',, 'N° Reserva', 'Descripción', 'Ingreso', 'Gasto', 'Balance']
    ];
    
    // Combinar y ordenar todas las transacciones
    const allTransactions = [
    ...allIncomeTransactions.map(t => ({ ...t, transactionType: 'INGRESO' })),
    ...allExpenseTransactions.map(t => ({ ...t, transactionType: 'GASTO' }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ordenar ascendente para calcular balance
    
    let runningBalance = 0;
    for (const transaction of allTransactions) {
    const bookingNumber = transaction.description.match(/#(\d+)/)?.[1] || '';
    const isIncome = transaction.transactionType === 'INGRESO';
    const incomeAmount = isIncome ? transaction.amount : 0;
    const expenseAmount = !isIncome ? transaction.amount : 0;
    
    runningBalance += incomeAmount - expenseAmount;
    
    allTransactionsData.push([
    new Date(transaction.date).toLocaleString('es-ES'),
    transaction.transactionType,
    transaction.vehicleName,
    
    bookingNumber,
    transaction.description,
    isIncome ? transaction.amount.toFixed(2) : '',
    !isIncome ? transaction.amount.toFixed(2) : '',
    runningBalance.toFixed(2)
    ]);
    }
    
    // Totales finales
    allTransactionsData.push([]);
    allTransactionsData.push([
    '',
    'TOTALES',
    '',
    '',
    '',
    '',
    totalIncome.toFixed(2),
    totalExpenses.toFixed(2),
    totalNet.toFixed(2)
    ]);
    
    const allTransactionsSheet = XLSX.utils.aoa_to_sheet(allTransactionsData);
    XLSX.utils.book_append_sheet(workbook, allTransactionsSheet, 'Libro Mayor');
    
    // 6. Generar el archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const fileName = `Reporte_${(owner as any).name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    this.logger.log(`[exportOwnerReport] Reporte generado exitosamente: ${fileName}`);
    
    return {
      buffer: excelBuffer,
      fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }
  
  private getDateRangeLabel(filters: MetricsFilters): string {
    if (!filters.dateFilter) {
      return 'Todos los períodos';
    }
    
    const { type, startDate, endDate } = filters.dateFilter;
    
    switch (type) {
      case 'day':
        return 'Hoy';
      case 'week':
        return 'Esta semana';
      case 'month':
        return 'Este mes';
      case 'lastMonth':
        return 'Mes pasado';
      case 'year':
        return 'Este año';
      case 'range':
        if (startDate && endDate) {
          return `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;
        }
        return 'Rango personalizado';
      default:
        return 'Período no especificado';
    }
  }
}