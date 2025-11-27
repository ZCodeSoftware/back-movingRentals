# ✅ Migración a Stripe Completada

## 🎉 Resumen de Cambios Realizados

La migración de Mercado Pago a Stripe ha sido completada exitosamente. A continuación se detallan todos los cambios realizados:

---

## 📦 Dependencias

### ✅ Instaladas:
- `stripe` - SDK oficial de Stripe para Node.js

### ✅ Desinstaladas:
- `mercadopago` - SDK de Mercado Pago (ya no necesario)

---

## 🔧 Archivos Modificados

### 1. `.env`
**Cambios:**
- ✅ Agregadas variables de Stripe:
  - `STRIPE_SECRET_KEY` - Clave secreta de test
  - `STRIPE_PUBLISHABLE_KEY` - Clave pública de test
  - `STRIPE_WEBHOOK_SECRET` - Pendiente de configurar cuando se cree el webhook en Stripe Dashboard
- ✅ Comentada variable de Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`

### 2. `src/config/index.ts`
**Cambios:**
- ✅ Reemplazada configuración de `mercadopago` por `stripe`
- ✅ Agregadas propiedades: `secretKey`, `publishableKey`, `webhookSecret`

### 3. `src/payments/domain/services/payment.service.interface.ts`
**Cambios:**
- ✅ Agregados nuevos métodos:
  - `handleWebhook(signature: string, payload: Buffer): Promise<any>`
  - `getPaymentStatus(sessionId: string): Promise<any>`

### 4. `src/payments/application/services/payment.service.ts`
**Cambios:**
- ✅ Reemplazado completamente con implementación de Stripe
- ✅ Inicialización del cliente Stripe con API version `2025-11-17.clover`
- ✅ Método `createPayment()` ahora crea Checkout Sessions de Stripe
- ✅ Agregado método `handleWebhook()` para procesar eventos de Stripe
- ✅ Agregado método `getPaymentStatus()` para consultar estado de pagos

### 5. `src/payments/infrastructure/nest/payment.controller.ts`
**Cambios:**
- ✅ Agregados nuevos endpoints:
  - `POST /api/v1/payments/stripe/create-checkout-session` - Crear sesión de pago
  - `POST /api/v1/payments/stripe/webhook` - Recibir webhooks de Stripe
  - `GET /api/v1/payments/stripe/session-status` - Consultar estado de sesión
- ✅ Endpoints antiguos de Mercado Pago marcados como deprecados (retornan error)

### 6. `src/main.ts`
**Cambios:**
- ✅ Habilitado `rawBody: true` en la creación de la app (necesario para webhooks)
- ✅ Configurado middleware para raw body en ruta del webhook de Stripe
- ✅ Aplicado tanto en función `createServer()` (Vercel) como en `bootstrap()` (desarrollo local)

---

## 🔌 Nuevos Endpoints

### Crear Sesión de Checkout
```
POST /api/v1/payments/stripe/create-checkout-session
```

**Body de ejemplo:**
```json
{
  "amount": 10000,
  "currency": "mxn",
  "description": "Reserva de Tour a Chichén Itzá",
  "userId": "user123",
  "customerEmail": "cliente@example.com",
  "customerName": "Juan Pérez",
  "metadata": {
    "bookingId": "booking123",
    "tourName": "Chichén Itzá"
  },
  "successUrl": "https://moovadventures.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://moovadventures.com/payment/cancel"
}
```

**Respuesta:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "publishableKey": "pk_test_..."
}
```

### Webhook de Stripe
```
POST /api/v1/payments/stripe/webhook
```
- Recibe eventos de Stripe (checkout.session.completed, payment_intent.succeeded, etc.)
- Verifica la firma del webhook automáticamente
- Procesa los eventos según su tipo

### Consultar Estado de Sesión
```
GET /api/v1/payments/stripe/session-status?session_id=cs_test_...
```

**Respuesta:**
```json
{
  "status": "paid",
  "customerEmail": "cliente@example.com",
  "amountTotal": 10000,
  "currency": "mxn",
  "metadata": {
    "bookingId": "booking123",
    "userId": "user123"
  }
}
```

---

## ⚠️ Endpoints Deprecados

Los siguientes endpoints ya NO funcionan y retornan error:

- ❌ `POST /api/v1/payments/mercadopago`
- ❌ `POST /api/v1/payments/mercadopago/webhook`

**Mensaje de error:**
```
"Este endpoint ha sido migrado a Stripe. Use /payments/stripe/create-checkout-session"
```

---

## 📝 Próximos Pasos

### 1. Configurar Webhook en Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/test/webhooks
2. Hacer clic en "Add endpoint"
3. URL del endpoint: `https://tender-unity-production-dbba.up.railway.app/api/v1/payments/stripe/webhook`
4. Seleccionar eventos:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Copiar el "Signing secret" (whsec_...)
6. Actualizar `.env` con el valor: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 2. Actualizar el Frontend

El frontend necesita cambios para usar los nuevos endpoints de Stripe:

**Antes (Mercado Pago):**
```javascript
const response = await fetch('/api/v1/payments/mercadopago', {
  method: 'POST',
  body: JSON.stringify(preferenceData)
});
const { id } = await response.json();
window.location.href = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${id}`;
```

**Después (Stripe):**
```javascript
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
      bookingId: 'booking123'
    }
  })
});

const { url } = await response.json();
window.location.href = url; // Redirigir a Stripe Checkout
```

### 3. Probar el Flujo Completo

**Tarjetas de prueba de Stripe:**
- ✅ Éxito: `4242 4242 4242 4242`
- ⚠️ Requiere autenticación: `4000 0025 0000 3155`
- ❌ Declinada: `4000 0000 0000 9995`

**Datos de prueba:**
- Fecha: Cualquier fecha futura
- CVC: Cualquier 3 dígitos
- Código postal: Cualquier 5 dígitos

### 4. Migrar a Producción

Cuando estés listo para producción:

1. Obtener claves de producción de Stripe:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
2. Configurar webhook de producción en Stripe Dashboard
3. Actualizar `.env` de producción con las nuevas claves
4. Desplegar cambios

---

## 🔍 Diferencias Clave: Mercado Pago vs Stripe

| Aspecto | Mercado Pago | Stripe |
|---------|--------------|--------|
| **Objeto de pago** | Preference | Checkout Session |
| **Identificador** | preference.id | session.id + session.url |
| **Montos** | En unidades (10.00) | En centavos (1000) |
| **Webhook** | notification_url | Endpoint con verificación de firma |
| **Respuesta** | Solo ID | URL completa + sessionId + publishableKey |
| **Redirección** | Manual a URL de MP | Automática a session.url |

---

## 🧪 Testing Local

Para probar localmente:

```bash
npm run start:dev
```

El servidor estará disponible en: `http://localhost:3000/api/v1`

**Endpoint de prueba:**
```bash
curl -X POST http://localhost:3000/api/v1/payments/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "mxn",
    "description": "Test de pago",
    "customerEmail": "test@example.com"
  }'
```

---

## 📚 Recursos

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks de Stripe](https://stripe.com/docs/webhooks)
- [Dashboard de Stripe (Test)](https://dashboard.stripe.com/test/dashboard)

---

## ✅ Checklist de Migración

- [x] Instalar dependencia de Stripe
- [x] Desinstalar dependencia de Mercado Pago
- [x] Actualizar variables de entorno (.env)
- [x] Actualizar archivo de configuración (config/index.ts)
- [x] Reemplazar PaymentService
- [x] Actualizar interfaz IPaymentService
- [x] Actualizar PaymentController
- [x] Configurar raw body en main.ts
- [x] Compilación exitosa
- [ ] Configurar webhook en Stripe Dashboard
- [ ] Actualizar código del frontend
- [ ] Probar flujo completo en modo test
- [ ] Migrar a claves de producción

---

## 🎯 Estado Actual

✅ **Backend migrado completamente a Stripe**
✅ **Compilación exitosa**
⏳ **Pendiente: Configurar webhook en Stripe Dashboard**
⏳ **Pendiente: Actualizar frontend**

---

## 💡 Notas Importantes

1. **Montos en centavos**: Recuerda que Stripe trabaja con centavos. $100.00 = 10000 centavos
2. **Webhook secret**: El `STRIPE_WEBHOOK_SECRET` está pendiente de configurar. Obtenerlo del Stripe Dashboard después de crear el webhook
3. **Claves de test**: Actualmente usando claves de test. Cambiar a producción cuando estés listo
4. **Compatibilidad**: Los endpoints antiguos de Mercado Pago retornan error para evitar confusión

---

**Fecha de migración:** ${new Date().toLocaleDateString('es-MX')}
**Versión de Stripe:** 2025-11-17.clover
