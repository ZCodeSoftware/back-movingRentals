import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookingTotalsService } from '../../../booking/application/services/booking-totals.service';
import { CatContractEvent } from '../../../core/infrastructure/mongo/schemas/catalogs/cat-contract-event.schema';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { IVehicleRepository } from '../../../vehicle/domain/repositories/vehicle.interface.repository';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { ContractModel } from '../../domain/models/contract.model';
import {
  IContractFilters,
  IContractRepository,
  IPaginatedContractResponse,
} from '../../domain/repositories/contract.interface.repository';
import { IContractService } from '../../domain/services/contract.interface.service';
import {
  ICreateContract,
  IUpdateContract,
} from '../../domain/types/contract.type';
import { ReportEventDTO } from '../../infrastructure/nest/dtos/contract.dto';
import SymbolsContract from '../../symbols-contract';
import { ContractMovementLinkService } from './contract-movement-link.service';
import { TypeCatPaymentMethodAdmin } from '../../../core/domain/enums/type-cat-payment-method-admin';
import { CommissionModel } from '../../../commission/domain/models/commission.model';
import { ICommissionRepository } from '../../../commission/domain/repositories/commission.interface.repository';
import SymbolsCommission from '../../../commission/symbols-commission';

@Injectable()
export class ContractService implements IContractService {
  constructor(
    @Inject(SymbolsContract.IContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(SymbolsVehicle.IVehicleRepository)
    private readonly vehicleRepository: IVehicleRepository,
    @Inject(SymbolsCommission.ICommissionRepository)
    private readonly commissionRepository: ICommissionRepository,
    private readonly bookingTotalsService: BookingTotalsService,
    @InjectModel(CatContractEvent.name)
    private readonly catContractEventModel: Model<CatContractEvent>,
    private readonly eventEmitter: EventEmitter2,
    private readonly contractMovementLinkService: ContractMovementLinkService,
  ) { }

  async create(
    contract: ICreateContract,
    userId: string,
  ): Promise<ContractModel> {
    const processedContract = {
      ...contract,
      createdByUser: userId,
      extension: contract.extension
        ? {
          ...contract.extension,
          newEndDateTime: contract.extension.newEndDateTime
            ? new Date(contract.extension.newEndDateTime)
            : undefined,
        }
        : undefined,
    };

    const contractModel = ContractModel.create(processedContract);
    const createdContract = await this.contractRepository.create(contractModel, userId);

    // Log extendido de debugging para sendEmail
    if (contract.sendEmail !== false) {
      this.eventEmitter.emit('send-contract.created', {
        contract: createdContract,
        userEmail: createdContract.toJSON().reservingUser?.email,
        lang: 'es', // Por defecto español, se puede mejorar para detectar idioma del usuario
      });
    } else {
      console.log('[ContractService] NO se dispara mail por sendEmail === false para contrato ID:', createdContract?.toJSON()._id, 'Request user:', userId);
    }

    return createdContract;
  }

  async findById(id: string): Promise<ContractModel> {
    return await this.contractRepository.findById(id);
  }

  async findByIdWithTotals(id: string): Promise<any> {
    const contract = await this.contractRepository.findById(id);

    if (!contract) {
      return null;
    }

    const contractData = contract.toJSON() as any;

    if (contract.booking) {
      try {
        const totals = await this.getBookingTotals(id);

        contractData.bookingTotals = totals;
      } catch (error) {
        console.warn(`[ContractService] Error calculating totals for contract ${id}:`, error);
        // Si hay error calculando totales, continuar sin ellos
      }
    } else {
      console.log(`[ContractService] Contract ${id} has no booking, skipping totals calculation`);
    }

    return contractData;
  }

  async findAll(
    filters: IContractFilters,
  ): Promise<IPaginatedContractResponse> {
    const result = await this.contractRepository.findAll(filters);
    if (Array.isArray(result.data)) {
      const dataWithTotals = await Promise.all(
        result.data.map(async (contract: any) => {
          let contractObj:any = contract;
          // Si viene como instancia de modelo con .toJSON(), conviértelo
          if (contract && typeof contract.toJSON === 'function') {
            contractObj = contract.toJSON();
          } else if (contract && typeof contract === 'object') {
            contractObj = { ...contract };
          }
          try {
            if (contractObj.booking && contractObj._id) {
              const totals = await this.getBookingTotals(contractObj._id);
              return {
                ...contractObj,
                bookingTotals: totals,
              };
            }
          } catch (e) {}
          return contractObj;
        })
      );
      return { ...result, data: dataWithTotals };
    }
    return result;
  }

  async update(
    id: string,
    updateData: IUpdateContract,
    userId: string,
  ): Promise<ContractModel> {
    const contractExists = await this.contractRepository.findById(id);
    if (!contractExists) {
      throw new NotFoundException(
        `El contrato con ID "${id}" no fue encontrado.`,
      );
    }

    try {
      const updated = await this.contractRepository.update(
        id,
        updateData,
        userId,
      );

      // Si es una extensión, crear comisión basada en el extensionAmount
      console.log('[ContractService] Checking extension commission creation:', {
        isExtension: (updateData as any).isExtension,
        hasExtension: !!updateData.extension,
        extensionAmount: updateData.extension?.extensionAmount,
        concierge: (updateData as any).concierge
      });

      if ((updateData as any).isExtension && updateData.extension?.extensionAmount) {
        try {
          const contractData = updated.toJSON();
          const bookingData = contractData.booking;
          
          console.log('[ContractService] Contract data for commission:', {
            hasBooking: !!bookingData,
            bookingId: bookingData?._id,
            bookingNumber: bookingData?.bookingNumber,
            reservingUserId: contractData.reservingUser?._id
          });
          
          if (bookingData) {
            const extensionAmount = updateData.extension.extensionAmount;
            const commissionPercentage = updateData.extension.commissionPercentage ?? 15;
            const concierge = (updateData as any).concierge;
            
            if (!concierge) {
              console.warn('[ContractService] No concierge provided, skipping commission creation');
              return updated;
            }
            
            // Calcular el monto de la comisión
            const commissionAmount = Math.round((extensionAmount * (commissionPercentage / 100)) * 100) / 100;
            
            console.log('[ContractService] Creating extension commission:', {
              extensionAmount,
              commissionPercentage,
              commissionAmount,
              concierge,
              bookingNumber: bookingData.bookingNumber,
              bookingId: bookingData._id,
              userId: contractData.reservingUser?._id
            });

            // Crear la comisión con source: 'extension'
            const commissionCreated = await this.commissionRepository.create(
              CommissionModel.create({
                booking: bookingData._id as any,
                bookingNumber: bookingData.bookingNumber as any,
                user: contractData.reservingUser?._id as any,
                vehicleOwner: concierge as any,
                vehicles: [], // Las extensiones no están asociadas a vehículos específicos
                detail: 'Extensión de Renta',
                status: 'PENDING',
                amount: commissionAmount as any,
                source: 'extension' as any,
                commissionPercentage: commissionPercentage,
              } as any)
            );

            console.log('[ContractService] Extension commission created successfully:', commissionCreated.toJSON());
          } else {
            console.warn('[ContractService] No booking data found in contract');
          }
        } catch (commissionError) {
          console.error('[ContractService] Error creating extension commission:', commissionError);
          console.error('[ContractService] Error stack:', commissionError.stack);
          // No fallar la actualización del contrato si falla la creación de la comisión
        }
      } else {
        console.log('[ContractService] Conditions not met for extension commission creation');
      }

      return updated;
    } catch (error) {
      console.error(
        `Fallo en la capa de servicio al actualizar el contrato ${id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Ocurrió un error al intentar actualizar el contrato.',
      );
    }
  }

  async reportEvent(
    contractId: string,
    userId: string,
    eventData: ReportEventDTO,
  ): Promise<ContractHistory> {
    // Validación de metadata.paymentMedium (si viene)
    const pm = (eventData as any)?.metadata?.paymentMedium;
    if (pm !== undefined && pm !== null) {
      const allowed = Object.values(TypeCatPaymentMethodAdmin);
      if (!allowed.includes(pm)) {
        throw new BadRequestException('metadata.paymentMedium inválido. Debe pertenecer a TypeCatPaymentMethodAdmin');
      }
    }

    // Si el evento tiene información monetaria, crear movimiento enlazado
    if (eventData.amount && eventData.paymentMethod) {
      console.log('[ContractService] Creando evento con movimiento enlazado');
      return await this.reportEventWithMovement(contractId, userId, eventData);
    }

    // Si no tiene información monetaria, crear solo la entrada del histórico
    const metadata = {
      ...eventData.metadata,
      amount: eventData.amount,
      paymentMethod: eventData.paymentMethod,
      vehicle: eventData.vehicle,
      beneficiary: eventData.beneficiary,
      date: eventData.date || new Date().toISOString(),
    };

    return await this.contractRepository.createHistoryEvent(
      contractId,
      userId,
      eventData.eventType,
      eventData.details,
      metadata,
    );
  }

  /**
   * Crea un evento del histórico con su movimiento correspondiente enlazado
   */
  async reportEventWithMovement(
    contractId: string,
    userId: string,
    eventData: ReportEventDTO,
  ): Promise<ContractHistory> {
    try {
      // Determinar el tipo y dirección del movimiento basándose en el evento
      const movementType = this.determineMovementType(eventData.eventType);
      const movementDirection = this.determineMovementDirection(eventData.eventType, eventData.amount);

      // Preparar datos para el servicio de enlace
      const linkedEventData = {
        ...eventData,
        type: movementType,
        direction: movementDirection,
        metadata: {
          ...eventData.metadata,
          amount: eventData.amount,
          paymentMethod: eventData.paymentMethod,
          vehicle: eventData.vehicle,
          beneficiary: eventData.beneficiary,
          date: eventData.date || new Date().toISOString(),
        }
      };

      // Crear movimiento e histórico enlazados
      const result = await this.contractMovementLinkService.createLinkedMovementAndHistory(
        contractId,
        userId,
        linkedEventData
      );

      console.log(`[ContractService] Creado enlace: Movimiento ${result.movement.id?.toValue()} ↔ Histórico ${(result.historyEntry as any)._id}`);

      return result.historyEntry;
    } catch (error) {
      console.error('[ContractService] Error creando evento con movimiento enlazado:', error);
      
      // Fallback: crear solo la entrada del histórico si falla el enlace
      const metadata = {
        ...eventData.metadata,
        amount: eventData.amount,
        paymentMethod: eventData.paymentMethod,
        vehicle: eventData.vehicle,
        beneficiary: eventData.beneficiary,
        date: eventData.date || new Date().toISOString(),
      };

      return await this.contractRepository.createHistoryEvent(
        contractId,
        userId,
        eventData.eventType,
        eventData.details,
        metadata,
      );
    }
  }

  /**
   * Determina el tipo de movimiento basándose en el tipo de evento
   */
  private determineMovementType(eventType: string): string {
    // Mapear tipos de eventos a tipos de movimientos
    const eventTypeMap: { [key: string]: string } = {
      'EXTENSION_PAYMENT': 'EXTENSION',
      'DAMAGE_PAYMENT': 'DAMAGE',
      'REFUND': 'REFUND',
      'PENALTY': 'PENALTY',
      'COMMISSION': 'COMMISSION',
      'MAINTENANCE': 'MAINTENANCE',
      'FUEL': 'FUEL',
      'CLEANING': 'CLEANING',
      'OTHER': 'OTHER'
    };

    // Si no encuentra el mapeo, usar un tipo genérico
    return eventTypeMap[eventType] || 'OTHER';
  }

  /**
   * Determina la dirección del movimiento basándose en el tipo de evento y monto
   */
  private determineMovementDirection(eventType: string, amount: number): 'IN' | 'OUT' {
    // Eventos que típicamente son ingresos (IN)
    const incomeEvents = [
      'EXTENSION_PAYMENT',
      'DAMAGE_PAYMENT', 
      'PENALTY',
      'ADDITIONAL_PAYMENT'
    ];

    // Eventos que típicamente son egresos (OUT)
    const expenseEvents = [
      'REFUND',
      'COMMISSION',
      'MAINTENANCE',
      'FUEL',
      'CLEANING',
      'REPAIR'
    ];

    if (incomeEvents.some(event => eventType.includes(event))) {
      return 'IN';
    }

    if (expenseEvents.some(event => eventType.includes(event))) {
      return 'OUT';
    }

    // Si no se puede determinar por el tipo, usar el signo del monto
    return amount >= 0 ? 'IN' : 'OUT';
  }

  /**
   * Obtiene los totales calculados para una reserva basándose en el histórico del contrato
   */
  async getBookingTotals(contractId: string): Promise<{
    originalTotal: number;
    netTotal: number;
    adjustments: Array<{
      eventType: string;
      eventName: string;
      amount: number;
      direction: 'IN' | 'OUT';
      date: Date;
      details: string;
    }>;
  }> {
    const contract = await this.contractRepository.findById(contractId);

    if (!contract || !contract.booking) {
      throw new NotFoundException('Contract or booking not found');
    }

    const bookingData = contract.booking.toJSON();
    const originalTotal = bookingData.total || 0;

    // Obtener el timeline del contrato que ya incluye los eventos con metadatos
    const timeline = await this.contractRepository.getTimelineForContract(contractId);

    return this.bookingTotalsService.calculateTotals(originalTotal, timeline);
  }

  async deleteHistoryEntry(
    historyId: string,
    userId: string,
    reason?: string
  ): Promise<ContractHistory> {
    try {
      // Intentar eliminar usando el servicio de enlace (elimina histórico y movimiento)
      const result = await this.contractMovementLinkService.deleteMovementWithHistory(
        historyId, // En este caso, usamos el historyId para buscar el movimiento relacionado
        userId,
        reason
      );
      
      if (result.historyEntry) {
        console.log(`[ContractService] Eliminado enlace: Histórico ${historyId} y movimiento relacionado`);
        return result.historyEntry;
      }
    } catch (error) {
      console.warn(`[ContractService] No se pudo eliminar con enlace, usando método directo: ${error.message}`);
    }

    // Fallback: eliminar solo la entrada del histórico
    return this.contractRepository.softDeleteHistoryEntry(historyId, userId, reason);
  }

  async restoreHistoryEntry(historyId: string): Promise<ContractHistory> {
    try {
      // Intentar restaurar usando el servicio de enlace (restaura histórico y movimiento)
      const result = await this.contractMovementLinkService.restoreMovementWithHistory(historyId);
      
      if (result.historyEntry) {
        console.log(`[ContractService] Restaurado enlace: Histórico ${historyId} y movimiento relacionado`);
        return result.historyEntry;
      }
    } catch (error) {
      console.warn(`[ContractService] No se pudo restaurar con enlace, usando método directo: ${error.message}`);
    }

    // Fallback: restaurar solo la entrada del histórico
    return this.contractRepository.restoreHistoryEntry(historyId);
  }

  async getDeletedHistoryEntries(contractId: string): Promise<ContractHistory[]> {
    return this.contractRepository.getDeletedHistoryEntries(contractId);
  }
}
