export interface ICreateVehicle {
    name: string;
    tag: string
    description?: string;
    images?: string[];
    price?: number;
    pricePer4?: number;
    pricePer8?: number;
    pricePer24?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
    minRentalHours: number;
    capacity: number;
    category: string;
    owner: string;
    model: string;
};

export interface IUpdateVehicle {
    name?: string;
    tag?: string
    description?: string;
    images?: string[];
    price?: number;
    pricePer4?: number;
    pricePer8?: number;
    pricePer24?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
    minRentalHours?: number;
    capacity?: number;
    isActive?: boolean;
    category?: string;
    owner?: string;
    model?: string;
}

export interface IUpdatePriceByModel {
    price?: number;
    pricePer4?: number;
    pricePer8?: number;
    pricePer24?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
}