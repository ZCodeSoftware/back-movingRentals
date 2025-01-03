export interface ICatCountryRepository {
  findById(catCountryId: string): Promise<any>;
}
