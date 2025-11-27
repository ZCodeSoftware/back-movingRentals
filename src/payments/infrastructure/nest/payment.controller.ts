import { 
    Body, 
    Controller, 
    Inject, 
    Post, 
    Get,
    Query,
    Logger, 
    HttpCode,
    Headers,
    RawBodyRequest,
    Req
} from "@nestjs/common";
import { Request } from 'express';
import { IPaymentService } from "../../domain/services/payment.service.interface";

@Controller('payments')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        @Inject('PaymentService')
        private readonly paymentService: IPaymentService
    ) { }

    @Post('stripe/create-checkout-session')
    async createCheckoutSession(@Body() body: any) {
        this.logger.log('Creando sesión de checkout en Stripe');
        return await this.paymentService.createPayment(body);
    }

    @Post('stripe/webhook')
    @HttpCode(200)
    async handleStripeWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>
    ) {
        this.logger.log('Webhook recibido de Stripe');
        
        try {
            // El payload debe ser el buffer raw del body
            const payload = request.rawBody;
            
            if (!payload) {
                throw new Error('No se recibió el payload del webhook');
            }

            return await this.paymentService.handleWebhook(signature, payload);
        } catch (error) {
            this.logger.error('Error procesando webhook de Stripe:', error);
            throw error;
        }
    }

    @Get('stripe/session-status')
    async getSessionStatus(@Query('session_id') sessionId: string) {
        this.logger.log(`Consultando estado de sesión: ${sessionId}`);
        return await this.paymentService.getPaymentStatus(sessionId);
    }

    // Mantener endpoint de Mercado Pago temporalmente para compatibilidad
    @Post('mercadopago')
    async createPaymentLegacy(@Body() body: any) {
        this.logger.warn('⚠️ Endpoint de Mercado Pago deprecado. Use /stripe/create-checkout-session');
        throw new Error('Este endpoint ha sido migrado a Stripe. Use /payments/stripe/create-checkout-session');
    }

    @Post('mercadopago/webhook')
    @HttpCode(200)
    async handleMercadoPagoWebhookLegacy(@Body() body: any) {
        this.logger.warn('⚠️ Webhook de Mercado Pago deprecado');
        return { success: false, message: 'Webhook migrado a Stripe' };
    }
}
