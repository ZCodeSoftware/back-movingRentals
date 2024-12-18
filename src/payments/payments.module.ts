import { Module } from "@nestjs/common";
import { PaymentService } from "./application/services/payment.service";
import { PaymentController } from "./infrastructure/nest/payment.controller";

@Module({
    imports: [],
    controllers: [PaymentController],
    providers: [{
        provide: 'PaymentService',
        useClass: PaymentService
    }],
    exports: []
})

export class PaymentsModule { }