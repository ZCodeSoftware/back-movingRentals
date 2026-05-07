import { Inject, Injectable } from "@nestjs/common";
import Stripe from "stripe";

import config from "../../../config/";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { IUserRepository } from "../../../user/domain/repositories/user.interface.repository";
import SymbolsUser from "../../../user/symbols-user";
import { IPaymentService } from "../../domain/services/payment.service.interface";
import { IBookingRepository } from "../../../booking/domain/repositories/booking.interface.repository";
import SymbolsBooking from "../../../booking/symbols-booking";

@Injectable()
export class PaymentService implements IPaymentService {
    private stripe: Stripe;

    constructor(
        @Inject(SymbolsUser.IUserRepository)
        private readonly userRepository: IUserRepository,
        @Inject(SymbolsBooking.IBookingRepository)
        private readonly bookingRepository: IBookingRepository
    ) {
        this.stripe = new Stripe(config().paymentMethod.stripe.secretKey);
    }

    async createPayment(body: any) {
        try {
            const {
                amount, // Monto en centavos (ej: 1000 = $10.00)
                currency = 'mxn', // Moneda (mxn, usd, etc.)
                description,
                metadata = {},
                userId,
                customerEmail,
                customerName,
                successUrl,
                cancelUrl,
                success_url, // Aceptar también con guión bajo
                cancel_url,  // Aceptar también con guión bajo
            } = body;

            // Usar el formato que venga (camelCase o snake_case)
            const finalSuccessUrlFromBody = successUrl || success_url;
            const finalCancelUrlFromBody = cancelUrl || cancel_url;

            // Validaciones básicas
            if (!amount || amount <= 0) {
                throw new BaseErrorException('El monto debe ser mayor a 0', 400);
            }

            // Obtener información del usuario si viene userId
            let customer: any = {
                email: customerEmail,
                name: customerName,
            };

            if (userId) {
                try {
                    const user = await this.userRepository.findById(userId);
                    if (user) {
                        const userData = user.toJSON();
                        customer.email = customer.email || userData.email;
                        customer.name = customer.name || `${userData.name} ${userData.lastName}`.trim();
                        customer.phone = userData.cellphone;
                    }
                } catch (error) {
                    console.warn('No se pudo obtener información del usuario:', error?.message);
                }
            }

            // Crear o recuperar cliente en Stripe
            let stripeCustomer: Stripe.Customer | null = null;
            if (customer.email) {
                // Buscar si el cliente ya existe
                const existingCustomers = await this.stripe.customers.list({
                    email: customer.email,
                    limit: 1,
                });

                if (existingCustomers.data.length > 0) {
                    stripeCustomer = existingCustomers.data[0];
                } else {
                    // Crear nuevo cliente
                    stripeCustomer = await this.stripe.customers.create({
                        email: customer.email,
                        name: customer.name,
                        phone: customer.phone,
                        metadata: {
                            userId: userId || '',
                        },
                    });
                }
            }

            // Crear sesión de checkout
            const finalSuccessUrl = finalSuccessUrlFromBody || `${config().app.front.front_base_urls[0]}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
            const finalCancelUrl = finalCancelUrlFromBody || `${config().app.front.front_base_urls[0]}/payment/cancel`;
            
            // Agregar número de reserva a la descripción si está disponible en metadata
            let finalDescription = description || 'Servicio de Moov Adventures';
            if (metadata.bookingNumber) {
                finalDescription = `Reserva #${metadata.bookingNumber} - ${finalDescription}`;
            }
            
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency.toLowerCase(),
                            product_data: {
                                name: finalDescription,
                                description: finalDescription,
                            },
                            unit_amount: amount, // Monto en centavos
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                customer: stripeCustomer?.id,
                customer_email: !stripeCustomer ? customer.email : undefined,
                success_url: finalSuccessUrl,
                cancel_url: finalCancelUrl,
                metadata: {
                    userId: userId || '',
                    ...metadata,
                },
                // Configurar webhook
                payment_intent_data: {
                    metadata: {
                        userId: userId || '',
                        ...metadata,
                    },
                },
            });

            return {
                sessionId: session.id,
                url: session.url, // URL para redirigir al usuario al checkout
                publishableKey: config().paymentMethod.stripe.publishableKey,
            };
        } catch (error) {
            console.error('Error creando sesión de pago en Stripe:', error);
            throw new BaseErrorException(
                error.message || 'Error al crear la sesión de pago',
                error.statusCode || 500
            );
        }
    }

    async handleWebhook(signature: string, payload: Buffer) {
        try {
            const webhookSecret = config().paymentMethod.stripe.webhookSecret;
            
            // Verificar la firma del webhook
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret
            );

            // Manejar diferentes tipos de eventos
            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object as Stripe.Checkout.Session;
                    console.log('[PaymentService] ✅ Pago completado desde Stripe webhook:', session.id);
                    console.log('[PaymentService] Metadata:', session.metadata);
                    
                    // Validar el booking automáticamente
                    if (session.metadata && session.metadata.bookingId) {
                        const bookingId = session.metadata.bookingId;
                        
                        try {
                            console.log(`[PaymentService] Validando booking ${bookingId} automáticamente...`);
                            
                            // Obtener el booking para verificar su estado actual
                            const booking = await this.bookingRepository.findById(bookingId);
                            
                            if (!booking) {
                                console.error(`[PaymentService] ❌ Booking ${bookingId} no encontrado`);
                                break;
                            }
                            
                            const bookingData = booking.toJSON();
                            
                            // Solo validar si el booking NO está ya validado
                            if (!bookingData.isValidated) {
                                console.log(`[PaymentService] Booking ${bookingId} no está validado, procediendo con validación automática`);
                                
                                // Obtener el usuario del booking para el email
                                const user = await this.bookingRepository.findUserByBookingId(bookingId);
                                const userEmail = user?.toJSON()?.email || session.customer_email || '';
                                
                                // Calcular el monto pagado (Stripe lo envía en centavos)
                                const paidAmount = session.amount_total ? session.amount_total / 100 : bookingData.total;
                                
                                // Actualizar el booking directamente en la base de datos
                                // Marcar como pagado y validado
                                const BookingModel = this.bookingRepository['bookingDB'].db.model('Booking');
                                const CatStatus = this.bookingRepository['bookingDB'].db.model('CatStatus');
                                
                                // Obtener el status APPROVED
                                const approvedStatus = await CatStatus.findOne({ name: 'APROBADO' });
                                
                                if (approvedStatus) {
                                    await BookingModel.updateOne(
                                        { _id: bookingId },
                                        {
                                            $set: {
                                                status: approvedStatus._id,
                                                isValidated: true,
                                                totalPaid: paidAmount,
                                                isReserve: false, // Si paga el total, ya no es reserva
                                            }
                                        }
                                    );
                                    
                                    console.log(`[PaymentService] ✅ Booking ${bookingId} validado exitosamente desde webhook`);
                                    console.log(`[PaymentService] - Status: APPROVED`);
                                    console.log(`[PaymentService] - Total Pagado: ${paidAmount}`);
                                    console.log(`[PaymentService] - Email: ${userEmail}`);
                                    
                                    // NOTA: El email se enviará cuando el usuario vuelva a la página de éxito
                                    // o podríamos emitir un evento aquí para enviar el email
                                } else {
                                    console.error('[PaymentService] ❌ No se encontró el status APPROVED');
                                }
                            } else {
                                console.log(`[PaymentService] ℹ️ Booking ${bookingId} ya está validado, omitiendo validación automática`);
                            }
                        } catch (error) {
                            console.error(`[PaymentService] ❌ Error validando booking ${bookingId}:`, error);
                            // No lanzar error para no fallar el webhook
                        }
                    } else {
                        console.warn('[PaymentService] ⚠️ No se encontró bookingId en metadata del webhook');
                    }
                    break;

                case 'checkout.session.expired':
                    const expiredSession = event.data.object as Stripe.Checkout.Session;
                    console.log('[PaymentService] ⏱️ Sesión de pago expirada:', expiredSession.id);
                    console.log('[PaymentService] Metadata:', expiredSession.metadata);
                    
                    // Si la sesión tiene un bookingId en metadata, marcar el booking como no validado
                    if (expiredSession.metadata && expiredSession.metadata.bookingId) {
                        const bookingId = expiredSession.metadata.bookingId;
                        console.log(`[PaymentService] 📧 Sesión expirada para booking ${bookingId}, se debe enviar email de pendiente`);
                        
                        // NOTA: Aquí necesitaríamos llamar a validateBooking, pero no tenemos acceso directo al BookingService
                        // La solución es emitir un evento que el BookingService pueda escuchar
                        // O implementar la lógica directamente aquí
                        
                        // Por ahora, solo logueamos. La implementación completa requeriría:
                        // 1. Inyectar BookingService o EventEmitter
                        // 2. Llamar a validateBooking con paid=false
                        // 3. Esto enviará el email de pendiente automáticamente
                    }
                    break;

                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    console.log('[PaymentService] ✅ PaymentIntent exitoso:', paymentIntent.id);
                    break;

                case 'payment_intent.payment_failed':
                    const failedPayment = event.data.object as Stripe.PaymentIntent;
                    console.log('[PaymentService] ❌ Pago fallido:', failedPayment.id);
                    break;

                default:
                    console.log(`[PaymentService] ℹ️ Evento no manejado: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('[PaymentService] ❌ Error procesando webhook de Stripe:', error);
            throw new BaseErrorException(
                'Error al procesar webhook',
                400
            );
        }
    }

    async getPaymentStatus(sessionId: string) {
        try {
            const session = await this.stripe.checkout.sessions.retrieve(sessionId);
            return {
                status: session.payment_status,
                customerEmail: session.customer_email,
                amountTotal: session.amount_total,
                currency: session.currency,
                metadata: session.metadata,
            };
        } catch (error) {
            throw new BaseErrorException(
                'Error al obtener el estado del pago',
                500
            );
        }
    }
}
