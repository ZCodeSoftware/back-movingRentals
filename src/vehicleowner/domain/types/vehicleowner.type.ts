export interface ICreateVehicleOwner {
    name: string;
    commissionPercentage: number;
};

export interface IUpdateVehicleOwner {
    name?: string;
    commissionPercentage?: number;
}