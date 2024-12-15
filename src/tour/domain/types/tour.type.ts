export interface ICreateTour {
    name: string
    description: string;
    price: number;
    itinerary: string;
    capacity?: string;
    estimatedDuration?: string;
    startDates?: string;
    images?: string[];
    category: string;
};
