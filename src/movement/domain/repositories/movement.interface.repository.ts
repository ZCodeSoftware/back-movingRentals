import { MovementModel } from "../models/movement.model";

export interface IMovementRepository {
    create(movement: any): Promise<MovementModel>;
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
}
