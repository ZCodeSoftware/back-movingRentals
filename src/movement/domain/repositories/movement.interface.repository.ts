import { MovementModel } from "../models/movement.model";

export interface IMovementRepository {
    create(movement: any): Promise<MovementModel>;
    update(id: string, movement: any): Promise<MovementModel>;
    findById(id: string): Promise<MovementModel>;
    findAll(filters: any, userId: string): Promise<{
        data: MovementModel[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;

    // Métodos para soft delete de movimientos
    softDeleteMovement(
        movementId: string,
        userId: string,
        reason?: string
    ): Promise<MovementModel>;

    restoreMovement(movementId: string): Promise<MovementModel>;

    getDeletedMovements(filters: any): Promise<MovementModel[]>;
}
