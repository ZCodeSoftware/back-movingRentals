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
            const preference = body

            // Agregar campos obligatorios y recomendados de Mercado Pago
            // 1. notification_url - OBLIGATORIO (14 puntos)
            if (!preference.notification_url) {
                const backendUrl = config().app.backend_url || process.env.BACKEND_URL;
                if (backendUrl) {
                    preference.notification_url = `${backendUrl}/payments/mercadopago/webhook`;
                }
            }

            // 2. external_reference - OBLIGATORIO (17 puntos)
            // Si no viene external_reference, generar uno único
            if (!preference.external_reference) {
                preference.external_reference = `booking-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            }

            // 3. items.category_id - RECOMENDADO (4 puntos)
            // 4. items.id - RECOMENDADO (4 puntos)
            if (preference.items && Array.isArray(preference.items)) {
                preference.items = preference.items.map((item: any, index: number) => ({
                    ...item,
                    // Agregar category_id si no existe (categoría de turismo/servicios)
                    category_id: item.category_id || 'services',
                    // Agregar id único si no existe
                    id: item.id || `item-${index}-${Date.now()}`,
                }));
            }

            const newPreference = new Preference(this.client)
            const result = await newPreference.create({ body: preference })
            return result.id
        } catch (error) {
            throw new BaseErrorException(error.message, 500)
        }
    }
}