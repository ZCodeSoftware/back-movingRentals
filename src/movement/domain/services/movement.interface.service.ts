import { MovementModel } from "../models/movement.model";
import { ICreateMovement } from "../types/movement.type";

export interface IMovementService {
    create(movement: ICreateMovement, userId: string): Promise<MovementModel>;
    findById(id: string): Promise<MovementModel>;
    findAll(filters: any): Promise<{
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
}
