export interface ICreateVehicle {
    name: string;
    description?: string;
    images?: string[];
    price?: number;
    pricePer4?: number;
    pricePer8?: number;
    pricePer24?: number;
    minRentalHours: number;
    capacity: number;
    category: string;
    owner: string;
};
