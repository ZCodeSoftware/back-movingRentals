export interface ICreateTour {
    name: string
    description: string;
    recommendations?: string;
    includes: string;
    price: number;
    images?: string[];
    category: string;
};
