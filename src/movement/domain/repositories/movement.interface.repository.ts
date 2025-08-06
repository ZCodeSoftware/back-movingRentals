import { MovementModel } from "../models/movement.model";

export interface IMovementRepository {
    create(movement: MovementModel): Promise<MovementModel>;
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
