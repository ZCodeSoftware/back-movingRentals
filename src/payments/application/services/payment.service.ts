import { Inject, Injectable } from "@nestjs/common";
import MercadoPagoConfig, { Preference } from "mercadopago";

import config from "../../../config/";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { IUserRepository } from "../../../user/domain/repositories/user.interface.repository";
import SymbolsUser from "../../../user/symbols-user";
import { IPaymentService } from "../../domain/services/payment.service.interface";

@Injectable()
export class PaymentService implements IPaymentService {
    private client: MercadoPagoConfig;

    constructor(
        @Inject(SymbolsUser.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {
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

            // 5. payer.first_name - RECOMENDADO (5 puntos)
            // 6. payer.last_name - RECOMENDADO (5 puntos)
            // Estos campos mejoran la tasa de aprobación y reducen rechazos por fraude
            if (!preference.payer) {
                preference.payer = {};
            }
            
            // Si no vienen los datos del comprador, intentar obtenerlos del usuario autenticado
            if (!preference.payer.first_name || !preference.payer.last_name || !preference.payer.email) {
                // Si viene userId, buscar la información del usuario en la base de datos
                if (body.userId && typeof body.userId === 'string') {
                    try {
                        const user = await this.userRepository.findById(body.userId);
                        if (user) {
                            const userData = user.toJSON();
                            // Solo agregar si los datos existen y son válidos
                            if (userData.name && !preference.payer.first_name) {
                                preference.payer.first_name = userData.name;
                            }
                            if (userData.lastName && !preference.payer.last_name) {
                                preference.payer.last_name = userData.lastName;
                            }
                            if (userData.email && !preference.payer.email) {
                                preference.payer.email = userData.email;
                            }
                            
                            // También agregar el teléfono si está disponible
                            if (userData.cellphone && !preference.payer.phone) {
                                preference.payer.phone = {
                                    area_code: '',
                                    number: userData.cellphone
                                };
                            }
                        }
                    } catch (error) {
                        // No hacer nada, simplemente continuar sin los datos del usuario
                        console.warn('No se pudo obtener información del usuario:', error?.message || 'Error desconocido');
                    }
                }
                
                // Si aún no hay datos y viene un nombre completo en payer.name, intentar dividirlo
                if ((!preference.payer.first_name || !preference.payer.last_name) && preference.payer.name) {
                    try {
                        const nameParts = preference.payer.name.trim().split(' ');
                        if (nameParts.length >= 2) {
                            if (!preference.payer.first_name) {
                                preference.payer.first_name = nameParts[0];
                            }
                            if (!preference.payer.last_name) {
                                preference.payer.last_name = nameParts.slice(1).join(' ');
                            }
                        } else if (nameParts.length === 1) {
                            // Si solo hay un nombre, usarlo para ambos campos
                            if (!preference.payer.first_name) {
                                preference.payer.first_name = nameParts[0];
                            }
                            if (!preference.payer.last_name) {
                                preference.payer.last_name = nameParts[0];
                            }
                        }
                    } catch (error) {
                        // Si falla el split, continuar sin problema
                        console.warn('Error al procesar payer.name:', error?.message || 'Error desconocido');
                    }
                }
            }

            const newPreference = new Preference(this.client)
            const result = await newPreference.create({ body: preference })
            return result.id
        } catch (error) {
            throw new BaseErrorException(error.message, 500)
        }
    }
}