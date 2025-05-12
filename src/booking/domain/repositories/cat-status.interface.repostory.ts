export interface ICatStatusRepository {
    getStatusByName(name: string): Promise<any>;
}