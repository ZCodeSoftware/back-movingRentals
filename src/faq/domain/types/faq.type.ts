export interface ICreateFaq {
    title: string;
    icon?: string;
    faqItems: FaqItem[];
}

export interface FaqItem {
    question: Translate;
    answer: Translate;
}

export interface Translate {
    en: string;
    es: string;
    [key: string]: string;
}
