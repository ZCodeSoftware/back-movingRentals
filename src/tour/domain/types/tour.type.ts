interface Translate {
    en?: string;
    es?: string;
}

export interface ICreateTour {
    name: string
    nameTranslations?: Translate;
    description: string;
    descriptionTranslations?: Translate;
    price: number;
    itinerary: string;
    itineraryTranslations?: Translate;
    capacity?: string;
    capacityTranslations?: Translate;
    estimatedDuration?: string;
    estimatedDurationTranslations?: Translate;
    startDates?: string;
    startDatesTranslations?: Translate;
    images?: string[];
    category: string;
};

export interface IUpdateTour {
    name?: string
    nameTranslations?: Translate;
    description?: string;
    descriptionTranslations?: Translate;
    price?: number;
    itinerary?: string;
    itineraryTranslations?: Translate;
    capacity?: string;
    capacityTranslations?: Translate;
    estimatedDuration?: string;
    estimatedDurationTranslations?: Translate;
    startDates?: string;
    startDatesTranslations?: Translate;
    images?: string[];
    isActive?: boolean;
    category?: string;
}

export interface IFilters {
    isActive?: boolean;
}