export interface ICreateVehicleOwner {
    name: string;
    commissionPercentage: number;
    phone: string;
    isConcierge?: boolean;
};

export interface IUpdateVehicleOwner {
    name?: string;
    commissionPercentage?: number;
    phone?: string;
    isConcierge?: boolean;
}

export interface IVehicleOwnerFilters {
    name?: string;
    isConcierge?: boolean;
    page?: number;
    limit?: number;
}