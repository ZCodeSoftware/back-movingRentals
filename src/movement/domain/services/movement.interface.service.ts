import { MovementModel } from "../models/movement.model";
import { ICreateMovement } from "../types/movement.type";

export interface IMovementService {
    create(movement: ICreateMovement, userId: string): Promise<MovementModel>;
    update(id: string, movement: Partial<ICreateMovement>): Promise<MovementModel>;
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

    // Métodos para gestión de movimientos
    deleteMovement(movementId: string, userId: string, reason?: string): Promise<MovementModel>;
    restoreMovement(movementId: string): Promise<MovementModel>;
    getDeletedMovements(filters: any): Promise<MovementModel[]>;
    
    // Método para exportar movimientos a Excel
    exportMovementsToExcel(filters: any): Promise<Buffer>;
}
