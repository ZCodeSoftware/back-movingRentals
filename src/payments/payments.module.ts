import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { PaymentService } from "./application/services/payment.service";
import { PaymentController } from "./infrastructure/nest/payment.controller";

@Module({
    imports: [UserModule],
    controllers: [PaymentController],
    providers: [{
        provide: 'PaymentService',
        useClass: PaymentService
    }],
    exports: []
})

export class PaymentsModule { }