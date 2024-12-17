import { Body, Controller, Inject, Post } from "@nestjs/common";
import { IPaymentService } from "src/payments/domain/services/payment.service.interface";

@Controller('payments')
export class PaymentController { 
    constructor(
        @Inject('PaymentService')
        private readonly paymentService: IPaymentService
    ) {}

    @Post('mercadopago')
    async createPayment(@Body() body: any) {
        return await this.paymentService.createPayment(body)
    }
}