import { Injectable } from "@nestjs/common";
import MercadoPagoConfig, { Preference } from "mercadopago";

import config from "../../../config/";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { IPaymentService } from "../../domain/services/payment.service.interface";

@Injectable()
export class PaymentService implements IPaymentService {
    private client: MercadoPagoConfig;

    constructor() {
        this.client = new MercadoPagoConfig({
            accessToken: config().paymentMethod.mercadopago.accessToken
        })
    }

    async createPayment(body: any) {
        try {
            const preference = {
                items: body,
                back_urls: {
                    success: `${config().app.front.front_base_url}/success`,
                    failure: `${config().app.front.front_base_url}/failure`,
                    pending: `${config().app.front.front_base_url}/pending`
                },
                auto_return: "approved"
            }

            const newPreference = new Preference(this.client)
            const result = await newPreference.create({ body: preference })
            return result.id
        } catch (error) {
            throw new BaseErrorException(error.message, 500)
        }
    }
}