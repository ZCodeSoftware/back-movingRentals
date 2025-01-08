export interface ICreateCategory {
    name: string
    disclaimerEn?: string
    disclaimerEs?: string
    image?: string
}

export interface IUpdateCategory {
    name?: string
    disclaimerEn?: string
    disclaimerEs?: string
    image?: string
}