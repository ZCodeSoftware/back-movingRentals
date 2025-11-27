export interface IPaymentService {
    createPayment(body: any): Promise<any>;
    handleWebhook(signature: string, payload: Buffer): Promise<any>;
    getPaymentStatus(sessionId: string): Promise<any>;
}