import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { IVehicleRepository } from '../../../vehicle/domain/repositories/vehicle.interface.repository';
import SymbolsVehicle from '../../../vehicle/symbols-vehicle';
import { ContractModel } from '../../domain/models/contract.model';
import { IContractFilters, IContractRepository, IPaginatedContractResponse } from '../../domain/repositories/contract.interface.repository';
import { IContractService } from '../../domain/services/contract.interface.service';
import { ICreateContract, IUpdateContract } from '../../domain/types/contract.type';
import { ReportEventDTO } from '../../infrastructure/nest/dtos/contract.dto';
import SymbolsContract from '../../symbols-contract';
import SymbolsMovement from '../../../movement/symbols-movement';
import { IMovementService } from '../../../movement/domain/services/movement.interface.service';
import { TypeMovementDirection } from '../../../core/domain/enums/type-movement-direction';
import { TypeCatTypeMovement } from '../../../core/domain/enums/type-cat-type-movement';

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
      return await this.contractRepository.update(id, updateData, userId);
    } catch (error) {
      // Capturar errores del repositorio y, si es necesario, transformarlos en errores HTTP.
      console.error(`Fallo en la capa de servicio al actualizar el contrato ${id}`, error);
      throw new InternalServerErrorException('Ocurrió un error al intentar actualizar el contrato.');
    }
  }

  async reportEvent(contractId: string, userId: string, eventData: ReportEventDTO): Promise<ContractHistory> {
    // 1) Crear el registro en contract_history referenciando el catálogo
    const history = await this.contractRepository.createHistoryEvent(
      contractId,
      userId,
      eventData.eventType,
      eventData.details,
      eventData.metadata
    );

    // 2) Crear el movimiento de ingreso asociado
    await this.movementService.create({
      type: TypeCatTypeMovement.LOCAL,
      direction: TypeMovementDirection.IN,
      detail: `Evento: ${eventData.details}`,
      amount: eventData.amount,
      date: eventData.date ? new Date(eventData.date) as any : (new Date() as any),
      paymentMethod: eventData.paymentMethod,
      vehicle: eventData.vehicle,
      beneficiary: eventData.beneficiary,
    }, userId);

    return history;
  }
}