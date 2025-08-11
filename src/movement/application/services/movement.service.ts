import { Inject, Injectable } from "@nestjs/common";
import { MovementModel } from "../../domain/models/movement.model";
import { IMovementRepository } from "../../domain/repositories/movement.interface.repository";
import { IMovementService } from "../../domain/services/movement.interface.service";
import { ICreateMovement } from "../../domain/types/movement.type";
import SymbolsMovement from "../../symbols-movement";

@Injectable()
export class MovementService implements IMovementService {
    constructor(
        @Inject(SymbolsMovement.IMovementRepository)
        private readonly movementRepository: IMovementRepository
    ) { }

    async create(movement: ICreateMovement, userId: string): Promise<MovementModel> {
        return this.movementRepository.create({ ...movement, createdBy: userId });
    }

    async findById(id: string): Promise<MovementModel> {
        return this.movementRepository.findById(id);
    }

    async findAll(filters: any, userId: string): Promise<{
        data: MovementModel[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }> {
        return this.movementRepository.findAll(filters, userId);
    }
}
