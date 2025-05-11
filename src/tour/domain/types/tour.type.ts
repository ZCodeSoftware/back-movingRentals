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

export interface IUpdateTour {
    name?: string
    description?: string;
    price?: number;
    itinerary?: string;
    capacity?: string;
    estimatedDuration?: string;
    startDates?: string;
    images?: string[];
    isActive?: boolean;
    category?: string;
}

export interface IFilters {
    isActive?: boolean;
}