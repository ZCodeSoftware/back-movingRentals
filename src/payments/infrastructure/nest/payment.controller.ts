import { Body, Controller, Inject, Post, Logger, HttpCode } from "@nestjs/common";
import { IPaymentService } from "../../domain/services/payment.service.interface";

@Controller('payments')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        @Inject('PaymentService')
        private readonly paymentService: IPaymentService
    ) { }

    @Post('mercadopago')
    async createPayment(@Body() body: any) {
        return await this.paymentService.createPayment(body)
    }

    @Post('mercadopago/webhook')
    @HttpCode(200)
    async handleMercadoPagoWebhook(@Body() body: any) {
        this.logger.log('Webhook recibido de Mercado Pago');
        this.logger.log(`Tipo: ${body.type}`);
        this.logger.log(`Datos: ${JSON.stringify(body)}`);

        try {
            // Aquí puedes procesar la notificación según el tipo
            // body.type puede ser: payment, plan, subscription, invoice, point_integration_wh, etc.
            // body.data.id contiene el ID del recurso (ej: payment_id)
            
            if (body.type === 'payment') {
                this.logger.log(`Payment ID: ${body.data.id}`);
                // Aquí puedes actualizar el estado del pago en tu base de datos
                // usando body.data.id para buscar el pago en Mercado Pago
            }

            return { success: true };
        } catch (error) {
            this.logger.error('Error procesando webhook de Mercado Pago:', error);
            return { success: false, error: error.message };
        }
    }
}