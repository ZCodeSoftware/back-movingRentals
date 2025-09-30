import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { TypeCatTypeMovement } from '../../../core/domain/enums/type-cat-type-movement';
import { TypeMovementDirection } from '../../../core/domain/enums/type-movement-direction';
import { CatContractEvent } from '../../../core/infrastructure/mongo/schemas/catalogs/cat-contract-event.schema';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { IMovementService } from '../../../movement/domain/services/movement.interface.service';
import SymbolsMovement from '../../../movement/symbols-movement';
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
    @Inject(SymbolsMovement.IMovementService)
    private readonly movementService: IMovementService,
    @InjectModel(CatContractEvent.name)
    private readonly catContractEventModel: Model<CatContractEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    console.log('[ContractService] Valor recibido de sendEmail:', contract.sendEmail, 'Tipo:', typeof contract.sendEmail);
    if (contract.sendEmail !== false) {
      console.log('[ContractService] DISPARANDO EVENTO DE CORREO (sendEmail !== false)');
      console.log('[ContractService] Contrato creado, ID:', createdContract?.toJSON()._id, 'Request user:', userId);
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
      const ext = updateData.extension as any;
      if (
        ext &&
        typeof ext.extensionAmount === 'number' &&
        ext.extensionAmount > 0 &&
        ext.paymentMethod
      ) {
        const catEvent = await this.catContractEventModel.findById(
          updateData.eventType,
        );
        const movementDetail = catEvent?.name ?? 'EXTENSION DE RENTA';
        await this.movementService.create(
          {
            type: TypeCatTypeMovement.LOCAL,
            direction: TypeMovementDirection.IN,
            detail: movementDetail,
            amount: ext.extensionAmount,
            date: new Date() as any,
            paymentMethod: updated.toJSON().extension.paymentMethod.name,
          },
          userId,
        );
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
    return await this.contractRepository.createHistoryEvent(
      contractId,
      userId,
      eventData.eventType,
      eventData.details,
      eventData.metadata,
    );
  }
}
