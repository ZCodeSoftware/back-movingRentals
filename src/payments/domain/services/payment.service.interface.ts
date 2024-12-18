export interface IPaymentService {
    createPayment(body: any): Promise<any>
}