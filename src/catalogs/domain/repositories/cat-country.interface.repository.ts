export interface ICatCountryRepository {
    findAll(): Promise<any>;
    findById(catCountryId: string): Promise<any>;
}