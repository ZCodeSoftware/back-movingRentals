export interface ICreateTransfer {
    name: string;
    description?: string;
    capacity: number;
    estimatedDuration: string;
    price: number;
    category: string;
};

export interface IUpdateTransfer {
    name?: string;
    description?: string;
    capacity?: number;
    estimatedDuration?: string;
    price?: number;
    isActive?: boolean;
    category?: string;
}

export interface IFilters {
    isActive?: boolean;
}