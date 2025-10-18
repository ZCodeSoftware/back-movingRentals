import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { Movement } from '../../../core/infrastructure/mongo/schemas/public/movement.schema';
import { IMovementService } from '../../../movement/domain/services/movement.interface.service';
import SymbolsMovement from '../../../movement/symbols-movement';
import { IContractRepository } from '../../domain/repositories/contract.interface.repository';
import SymbolsContract from '../../symbols-contract';

@Injectable()
export class ContractMovementLinkService {
  constructor(
    @InjectModel(ContractHistory.name)
    private readonly contractHistoryModel: Model<ContractHistory>,
    @InjectModel(Movement.name)
    private readonly movementModel: Model<Movement>,
    @Inject(SymbolsContract.IContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(SymbolsMovement.IMovementService)
    private readonly movementService: IMovementService,
  ) {}

  /**
   * Elimina un movimiento y su entrada relacionada en el histórico del contrato
   */
  async deleteMovementWithHistory(
    movementId: string,
    userId: string,
    reason?: string
  ): Promise<{ movement: any; historyEntry: any }> {
    // 1. Buscar el movimiento
    const movement = await this.movementModel.findById(movementId);
    if (!movement) {
      throw new Error('Movimiento no encontrado');
    }

    // 2. Buscar la entrada del histórico relacionada
    let historyEntry = null;
    if (movement.contractHistoryEntry) {
      historyEntry = await this.contractHistoryModel.findById(movement.contractHistoryEntry);
    } else {
      // Buscar por metadatos si no hay relación directa
      historyEntry = await this.contractHistoryModel.findOne({
        'eventMetadata.amount': movement.amount,
        'eventMetadata.date': movement.date,
        'eventMetadata.vehicle': movement.vehicle,
        'eventMetadata.beneficiary': movement.beneficiary,
        isDeleted: false
      });
    }

    // 3. Eliminar el movimiento (soft delete)
    const deletedMovement = await this.movementService.deleteMovement(movementId, userId, reason);

    // 4. Eliminar la entrada del histórico si existe (soft delete)
    let deletedHistoryEntry = null;
    if (historyEntry) {
      deletedHistoryEntry = await this.contractRepository.softDeleteHistoryEntry(
        historyEntry._id.toString(),
        userId,
        reason
      );
    }

    return {
      movement: deletedMovement,
      historyEntry: deletedHistoryEntry
    };
  }

  /**
   * Elimina una entrada del histórico y su movimiento relacionado
   */
  async deleteHistoryWithMovement(
    historyId: string,
    userId: string,
    reason?: string
  ): Promise<{ movement: any; historyEntry: any }> {
    // 1. Buscar la entrada del histórico
    const historyEntry = await this.contractHistoryModel.findById(historyId);
    if (!historyEntry) {
      throw new Error('Entrada del histórico no encontrada');
    }

    // 2. Buscar el movimiento relacionado
    let movement = null;
    if (historyEntry.relatedMovement) {
      movement = await this.movementModel.findById(historyEntry.relatedMovement);
    } else {
      // Buscar por referencia inversa
      movement = await this.movementModel.findOne({
        contractHistoryEntry: historyId,
        isDeleted: false
      });
    }

    // 3. Eliminar la entrada del histórico (soft delete)
    const deletedHistoryEntry = await this.contractRepository.softDeleteHistoryEntry(
      historyId,
      userId,
      reason
    );

    // 4. Eliminar el movimiento si existe (soft delete)
    let deletedMovement = null;
    if (movement) {
      deletedMovement = await this.movementService.deleteMovement(
        movement._id.toString(),
        userId,
        reason
      );
    }

    return {
      movement: deletedMovement,
      historyEntry: deletedHistoryEntry
    };
  }

  /**
   * Restaura un movimiento y su entrada relacionada en el histórico del contrato
   */
  async restoreMovementWithHistory(movementId: string): Promise<{ movement: any; historyEntry: any }> {
    // 1. Restaurar el movimiento
    const restoredMovement = await this.movementService.restoreMovement(movementId);

    // 2. Buscar y restaurar la entrada del histórico relacionada
    const movement = await this.movementModel.findById(movementId);
    let restoredHistoryEntry = null;

    if (movement?.contractHistoryEntry) {
      restoredHistoryEntry = await this.contractRepository.restoreHistoryEntry(
        movement.contractHistoryEntry.toString()
      );
    } else {
      // Buscar por metadatos si no hay relación directa
      const historyEntry = await this.contractHistoryModel.findOne({
        'eventMetadata.amount': movement?.amount,
        'eventMetadata.date': movement?.date,
        'eventMetadata.vehicle': movement?.vehicle,
        'eventMetadata.beneficiary': movement?.beneficiary,
        isDeleted: true
      });

      if (historyEntry) {
        restoredHistoryEntry = await this.contractRepository.restoreHistoryEntry(
          historyEntry._id.toString()
        );
      }
    }

    return {
      movement: restoredMovement,
      historyEntry: restoredHistoryEntry
    };
  }

  /**
   * Restaura una entrada del histórico y su movimiento relacionado
   */
  async restoreHistoryWithMovement(historyId: string): Promise<{ movement: any; historyEntry: any }> {
    // 1. Buscar la entrada del histórico (incluyendo eliminados)
    const historyEntry = await this.contractHistoryModel
      .findById(historyId)
      .setOptions({ includeDeleted: true });
    
    if (!historyEntry) {
      throw new Error('Entrada del histórico no encontrada');
    }

    // 2. Buscar el movimiento relacionado
    let movement = null;
    if (historyEntry.relatedMovement) {
      movement = await this.movementModel.findById(historyEntry.relatedMovement);
    } else {
      // Buscar por referencia inversa
      movement = await this.movementModel.findOne({
        contractHistoryEntry: historyId,
        isDeleted: true
      });
    }

    // 3. Restaurar la entrada del histórico
    const restoredHistoryEntry = await this.contractRepository.restoreHistoryEntry(historyId);

    // 4. Restaurar el movimiento si existe
    let restoredMovement = null;
    if (movement) {
      restoredMovement = await this.movementService.restoreMovement(
        movement._id.toString()
      );
    }

    return {
      movement: restoredMovement,
      historyEntry: restoredHistoryEntry
    };
  }

  /**
   * Crea un movimiento y lo vincula con una entrada del histórico del contrato
   */
  async createLinkedMovementAndHistory(
    contractId: string,
    userId: string,
    eventData: any
  ): Promise<{ movement: any; historyEntry: any }> {
    // 1. Crear la entrada del histórico
    const historyEntry = await this.contractRepository.createHistoryEvent(
      contractId,
      userId,
      eventData.eventType,
      eventData.details,
      {
        ...eventData.metadata,
        amount: eventData.amount,
        paymentMethod: eventData.paymentMethod,
        vehicle: eventData.vehicle,
        beneficiary: eventData.beneficiary,
        date: eventData.date || new Date().toISOString(),
      }
    );

    // 2. Crear el movimiento con referencia al histórico
    const movementData = {
      type: eventData.type,
      direction: eventData.direction,
      detail: eventData.details,
      amount: eventData.amount,
      date: eventData.date || new Date(),
      paymentMethod: eventData.paymentMethod,
      vehicle: eventData.vehicle,
      beneficiary: eventData.beneficiary,
      contractHistoryEntry: (historyEntry as any)._id
    };

    const movement = await this.movementService.create(movementData, userId);

    // 3. Actualizar la entrada del histórico con la referencia al movimiento
    await this.contractHistoryModel.findByIdAndUpdate(
      (historyEntry as any)._id,
      { relatedMovement: movement.id?.toValue() }
    );

    return {
      movement,
      historyEntry
    };
  }
}