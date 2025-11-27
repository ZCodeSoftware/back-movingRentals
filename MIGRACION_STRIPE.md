# Migración de Mercado Pago a Stripe

## 📋 Resumen de la Implementación Actual

Tu aplicación actualmente usa **Mercado Pago** con la siguiente estructura:

### Archivos Involucrados:
- `src/payments/application/services/payment.service.ts` - Servicio principal de pagos
- `src/payments/infrastructure/nest/payment.controller.ts` - Controlador de endpoints
- `src/payments/domain/services/payment.service.interface.ts` - Interfaz del servicio
- `src/payments/payments.module.ts` - Módulo de pagos
- `src/config/index.ts` - Configuración (incluye token de Mercado Pago)
- `.env` - Variables de entorno

### Endpoints Actuales:
- `POST /api/v1/payments/mercadopago` - Crear preferencia de pago
- `POST /api/v1/payments/mercadopago/webhook` - Webhook de notificaciones

---

## 🎯 Plan de Migración a Stripe

### 1. **Instalación de Dependencias**

```bash
npm install stripe
npm uninstall mercadopago
```

### 2. **Configuración de Variables de Entorno**

Agregar a tu archivo `.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_... # Tu clave secreta de Stripe (test o producción)
STRIPE_PUBLISHABLE_KEY=pk_test_... # Tu clave pública de Stripe
STRIPE_WEBHOOK_SECRET=whsec_... # Secret del webhook (se obtiene al configurar el webhook en Stripe)
```

**Eliminar o comentar:**
```env
# MERCADOPAGO_ACCESS_TOKEN = APP_USR-4231990919086577-121613-10d22bcea7a19ae3c402758f302133d9-2162761832
```

### 3. **Actualizar Configuración (src/config/index.ts)**

**Reemplazar:**
```typescript
paymentMethod: {
  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  },
},
```

**Por:**
```typescript
paymentMethod: {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
},
```

### 4. **Actualizar el Servicio de Pagos**

Reemplazar completamente `src/payments/application/services/payment.service.ts`:

```typescript
import { Inject, Injectable } from "@nestjs/common";
import Stripe from "stripe";

import config from "../../../config/";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import { IUserRepository } from "../../../user/domain/repositories/user.interface.repository";
import SymbolsUser from "../../../user/symbols-user";
import { IPaymentService } from "../../domain/services/payment.service.interface";

@Injectable()
export class PaymentService implements IPaymentService {
    private stripe: Stripe;

    constructor(
        @Inject(SymbolsUser.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {
        this.stripe = new Stripe(config().paymentMethod.stripe.secretKey, {
            apiVersion: '2024-12-18.acacia', // Usa la versión más reciente
        });
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
            } = body;

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
            const backendUrl = config().app.backend_url || process.env.BACKEND_URL;
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency.toLowerCase(),
                            product_data: {
                                name: description || 'Servicio de Moov Adventures',
                                description: description,
                            },
                            unit_amount: amount, // Monto en centavos
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                customer: stripeCustomer?.id,
                customer_email: !stripeCustomer ? customer.email : undefined,
                success_url: successUrl || `${config().app.front.front_base_urls[0]}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl || `${config().app.front.front_base_urls[0]}/payment/cancel`,
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
                    console.log('Pago completado:', session.id);
                    // Aquí puedes actualizar tu base de datos
                    // Por ejemplo: marcar una reserva como pagada
                    break;

                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    console.log('PaymentIntent exitoso:', paymentIntent.id);
                    break;

                case 'payment_intent.payment_failed':
                    const failedPayment = event.data.object as Stripe.PaymentIntent;
                    console.log('Pago fallido:', failedPayment.id);
                    break;

                default:
                    console.log(`Evento no manejado: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('Error procesando webhook de Stripe:', error);
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
```

### 5. **Actualizar la Interfaz del Servicio**

Actualizar `src/payments/domain/services/payment.service.interface.ts`:

```typescript
export interface IPaymentService {
    createPayment(body: any): Promise<any>;
    handleWebhook(signature: string, payload: Buffer): Promise<any>;
    getPaymentStatus(sessionId: string): Promise<any>;
}
```

### 6. **Actualizar el Controlador**

Reemplazar `src/payments/infrastructure/nest/payment.controller.ts`:

```typescript
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
}
```

### 7. **Configurar Raw Body para Webhooks**

Stripe requiere el body raw para verificar la firma del webhook. Actualizar `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Habilitar raw body
  });

  // Configurar raw body solo para el webhook de Stripe
  app.use('/api/v1/payments/stripe/webhook', json({ 
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  app.useGlobalPipes(new ValidationPipe());
  
  // ... resto de tu configuración
  
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

---

## 🔄 Comparación: Mercado Pago vs Stripe

| Aspecto | Mercado Pago | Stripe |
|---------|--------------|--------|
| **Objeto de pago** | Preference | Checkout Session |
| **Identificador** | preference.id | session.id + session.url |
| **Webhook** | notification_url | webhook endpoint con firma |
| **Verificación** | No requiere verificación | Requiere verificar firma |
| **Respuesta** | ID de preferencia | URL de checkout + sessionId |
| **Montos** | En unidades (10.00) | En centavos (1000) |

---

## 📝 Cambios en el Frontend

El frontend necesitará ajustes para usar Stripe en lugar de Mercado Pago:

### Antes (Mercado Pago):
```javascript
// Crear preferencia
const response = await fetch('/api/v1/payments/mercadopago', {
  method: 'POST',
  body: JSON.stringify(preferenceData)
});
const { id } = await response.json();

// Redirigir a Mercado Pago
window.location.href = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${id}`;
```

### Después (Stripe):
```javascript
// Crear sesión de checkout
const response = await fetch('/api/v1/payments/stripe/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 10000, // $100.00 en centavos
    currency: 'mxn',
    description: 'Reserva de tour',
    userId: 'user123',
    customerEmail: 'cliente@example.com',
    metadata: {
      bookingId: 'booking123',
      tourName: 'Tour a Chichén Itzá'
    }
  })
});

const { url, sessionId } = await response.json();

// Redirigir a Stripe Checkout
window.location.href = url;
```

### Verificar Estado del Pago:
```javascript
// Después de que el usuario regrese del checkout
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

if (sessionId) {
  const response = await fetch(`/api/v1/payments/stripe/session-status?session_id=${sessionId}`);
  const status = await response.json();
  
  if (status.status === 'paid') {
    // Pago exitoso
    console.log('Pago completado');
  }
}
```

---

## 🔐 Configurar Webhook en Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/webhooks
2. Hacer clic en "Add endpoint"
3. URL del endpoint: `https://tu-dominio.com/api/v1/payments/stripe/webhook`
4. Seleccionar eventos a escuchar:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copiar el "Signing secret" (whsec_...) y agregarlo a tu `.env` como `STRIPE_WEBHOOK_SECRET`

---

## ✅ Checklist de Migración

- [ ] Instalar dependencia de Stripe
- [ ] Desinstalar dependencia de Mercado Pago
- [ ] Obtener claves de API de Stripe (test y producción)
- [ ] Actualizar variables de entorno (.env)
- [ ] Actualizar archivo de configuración (config/index.ts)
- [ ] Reemplazar PaymentService
- [ ] Actualizar interfaz IPaymentService
- [ ] Actualizar PaymentController
- [ ] Configurar raw body en main.ts
- [ ] Configurar webhook en Stripe Dashboard
- [ ] Actualizar código del frontend
- [ ] Probar flujo completo en modo test
- [ ] Actualizar documentación
- [ ] Migrar a claves de producción

---

## 🧪 Testing

### Tarjetas de Prueba de Stripe:

- **Éxito**: `4242 4242 4242 4242`
- **Requiere autenticación**: `4000 0025 0000 3155`
- **Declinada**: `4000 0000 0000 9995`

Fecha de expiración: Cualquier fecha futura
CVC: Cualquier 3 dígitos
Código postal: Cualquier 5 dígitos

---

## 📚 Recursos Adicionales

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks de Stripe](https://stripe.com/docs/webhooks)
- [API de Stripe para Node.js](https://github.com/stripe/stripe-node)

---

## ⚠️ Notas Importantes

1. **Montos**: Stripe trabaja con centavos. $100.00 = 10000 centavos
2. **Webhooks**: SIEMPRE verifica la firma del webhook en producción
3. **Claves**: Nunca expongas tu clave secreta en el frontend
4. **Testing**: Usa las claves de test (sk_test_...) durante desarrollo
5. **Producción**: Cambia a claves de producción (sk_live_...) al desplegar

---

## 🆘 Soporte

Si tienes problemas durante la migración:
1. Revisa los logs del servidor
2. Verifica que las claves de API sean correctas
3. Confirma que el webhook esté configurado correctamente
4. Usa el dashboard de Stripe para ver los eventos y logs
