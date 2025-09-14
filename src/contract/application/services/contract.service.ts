import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TypeCatTypeMovement } from '../../../core/domain/enums/type-cat-type-movement';
import { TypeMovementDirection } from '../../../core/domain/enums/type-movement-direction';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { IMovementService } from '../../../movement/domain/services/movement.interface.service';
import SymbolsMovement from '../../../movement/symbols-movement';
import { IVehicleRepository } from '../../../vehicle/domain/repositories/vehicle.interface.repository';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { ContractModel } from '../../domain/models/contract.model';
import { IContractFilters, IContractRepository, IPaginatedContractResponse } from '../../domain/repositories/contract.interface.repository';
import { IContractService } from '../../domain/services/contract.interface.service';
import { ICreateContract, IUpdateContract } from '../../domain/types/contract.type';
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
  ) { }

  async create(contract: ICreateContract, userId: string): Promise<ContractModel> {
    const processedContract = {
      ...contract,
      createdByUser: userId,
      extension: contract.extension ? {
        ...contract.extension,
        newEndDateTime: contract.extension.newEndDateTime ? new Date(contract.extension.newEndDateTime) : undefined,
      } : undefined,
    };

    const contractModel = ContractModel.create(processedContract);

    return await this.contractRepository.create(contractModel, userId);
  }

  async findById(id: string): Promise<ContractModel> {
    return await this.contractRepository.findById(id);
  }

  async findAll(filters: IContractFilters): Promise<IPaginatedContractResponse> {
    return await this.contractRepository.findAll(filters);
  }

  async update(id: string, updateData: IUpdateContract, userId: string): Promise<ContractModel> {
    const contractExists = await this.contractRepository.findById(id);
    if (!contractExists) {
      throw new NotFoundException(`El contrato con ID "${id}" no fue encontrado.`);
    }

    try {
      const updated = await this.contractRepository.update(id, updateData, userId);

      // Generar movimiento al actualizar el contrato (por ejemplo, extensión)
      const ext = updateData.extension as any;
      if (ext && typeof ext.extensionAmount === 'number' && ext.extensionAmount > 0 && ext.paymentMethod) {
        await this.movementService.create({
          type: TypeCatTypeMovement.LOCAL,
          direction: TypeMovementDirection.IN,
          detail: 'Actualización de contrato (extensión)',
          amount: ext.extensionAmount,
          date: new Date() as any,
          paymentMethod: updated.toJSON().extension.paymentMethod.name,
        }, userId);
      }

      return updated;
    } catch (error) {
      // Capturar errores del repositorio y, si es necesario, transformarlos en errores HTTP.
      console.error(`Fallo en la capa de servicio al actualizar el contrato ${id}`, error);
      throw new InternalServerErrorException('Ocurrió un error al intentar actualizar el contrato.');
    }
  }

  async reportEvent(contractId: string, userId: string, eventData: ReportEventDTO): Promise<ContractHistory> {
    return await this.contractRepository.createHistoryEvent(
      contractId,
      userId,
      eventData.eventType,
      eventData.details,
      eventData.metadata
    );
  }
}