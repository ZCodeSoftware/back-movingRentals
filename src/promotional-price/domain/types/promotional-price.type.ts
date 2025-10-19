export interface ICreatePromotionalPrice {
    model: string;
    startDate: Date | string;
    endDate: Date | string;
    price?: number;
    pricePer4?: number;
    pricePer8?: number;
    pricePer24?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
    description?: string;
}

export interface IUpdatePromotionalPrice {
    model?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    price?: number;
    pricePer4?: number;
    pricePer8?: number;
    pricePer24?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
    isActive?: boolean;
    description?: string;
}
