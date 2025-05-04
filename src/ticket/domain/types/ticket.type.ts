export interface ICreateTicket {
    name: string;
    description?: string;
    location: string;
    totalPrice: number;
    movingPrice: number;
    cenotePrice: number;
    category: string;
};

export interface IUpdateTicket {
    name?: string;
    description?: string;
    location?: string;
    totalPrice?: number;
    movingPrice?: number;
    cenotePrice?: number;
    category?: string;
    isActive?: boolean;
}

export interface IFilters {
    isActive?: boolean;
}