import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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

@Injectable()
export class ContractService implements IContractService {
  constructor(
    @Inject(SymbolsContract.IContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(SymbolsVehicle.IVehicleRepository)
    private readonly vehicleRepository: IVehicleRepository,
    private readonly bookingTotalsService: BookingTotalsService,
    @InjectModel(CatContractEvent.name)
    private readonly catContractEventModel: Model<CatContractEvent>,
    private readonly eventEmitter: EventEmitter2,
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
    return await this.contractRepository.findAll(filters);
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
      // La lógica de extensión ya se maneja en el histórico del contrato
      // Los movimientos monetarios se registran a través de reportEvent

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
    // Crear metadatos que incluyan la información monetaria
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
}
