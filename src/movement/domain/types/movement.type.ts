export interface ICreateMovement {
    type: string;
    detail: string;
    amount: number;
    date: Date;
    vehicle?: string;
};
