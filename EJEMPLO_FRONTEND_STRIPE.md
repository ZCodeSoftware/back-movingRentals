# 🎨 Ejemplo de Integración Frontend con Stripe

Este documento muestra cómo integrar el nuevo sistema de pagos de Stripe en tu frontend.

---

## 📋 Flujo de Pago

1. Usuario selecciona un servicio/tour y hace clic en "Pagar"
2. Frontend envía datos al backend para crear una sesión de checkout
3. Backend responde con la URL de Stripe Checkout
4. Frontend redirige al usuario a Stripe Checkout
5. Usuario completa el pago en Stripe
6. Stripe redirige al usuario de vuelta a tu sitio (success o cancel)
7. Frontend verifica el estado del pago

---

## 🔧 Implementación

### 1. Crear Sesión de Checkout

```javascript
// Función para crear una sesión de pago
async function createCheckoutSession(bookingData) {
  try {
    const response = await fetch('https://tender-unity-production-dbba.up.railway.app/api/v1/payments/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Si usas autenticación, agregar token aquí
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        // Monto en centavos (ej: $100.00 = 10000)
        amount: bookingData.totalAmount * 100,
        
        // Moneda (mxn, usd, etc.)
        currency: 'mxn',
        
        // Descripción del servicio
        description: `Reserva: ${bookingData.tourName}`,
        
        // ID del usuario (si está autenticado)
        userId: bookingData.userId,
        
        // Email del cliente
        customerEmail: bookingData.email,
        
        // Nombre del cliente
        customerName: bookingData.name,
        
        // Metadata adicional (útil para tracking)
        metadata: {
          bookingId: bookingData.bookingId,
          tourId: bookingData.tourId,
          tourName: bookingData.tourName,
          date: bookingData.date,
          passengers: bookingData.passengers
        },
        
        // URLs de redirección
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      })
    });

    if (!response.ok) {
      throw new Error('Error al crear la sesión de pago');
    }

    const data = await response.json();
    
    // Redirigir al usuario a Stripe Checkout
    window.location.href = data.url;
    
  } catch (error) {
    console.error('Error:', error);
    alert('Hubo un error al procesar el pago. Por favor intenta de nuevo.');
  }
}
```

### 2. Botón de Pago

```html
<!-- HTML -->
<button id="checkout-button" onclick="handleCheckout()">
  Proceder al Pago
</button>

<script>
async function handleCheckout() {
  // Deshabilitar botón para evitar doble clic
  const button = document.getElementById('checkout-button');
  button.disabled = true;
  button.textContent = 'Procesando...';
  
  try {
    // Obtener datos de la reserva
    const bookingData = {
      totalAmount: 1500, // $1,500.00 MXN
      tourName: 'Tour a Chichén Itzá',
      userId: 'user123', // Si el usuario está autenticado
      email: 'cliente@example.com',
      name: 'Juan Pérez',
      bookingId: 'booking123',
      tourId: 'tour456',
      date: '2024-03-15',
      passengers: 2
    };
    
    await createCheckoutSession(bookingData);
  } catch (error) {
    // Rehabilitar botón en caso de error
    button.disabled = false;
    button.textContent = 'Proceder al Pago';
  }
}
</script>
```

### 3. Página de Éxito (Success)

```javascript
// success.js - Página que se muestra después de un pago exitoso

async function verifyPayment() {
  // Obtener session_id de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (!sessionId) {
    console.error('No se encontró session_id');
    return;
  }
  
  try {
    // Verificar el estado del pago
    const response = await fetch(
      `https://tender-unity-production-dbba.up.railway.app/api/v1/payments/stripe/session-status?session_id=${sessionId}`
    );
    
    if (!response.ok) {
      throw new Error('Error al verificar el pago');
    }
    
    const paymentData = await response.json();
    
    if (paymentData.status === 'paid') {
      // Pago exitoso
      displaySuccessMessage(paymentData);
      
      // Aquí puedes actualizar tu base de datos, enviar confirmación, etc.
      // Por ejemplo, marcar la reserva como pagada
      await updateBookingStatus(paymentData.metadata.bookingId, 'paid');
      
    } else if (paymentData.status === 'unpaid') {
      // Pago pendiente
      displayPendingMessage();
    } else {
      // Otro estado
      displayErrorMessage();
    }
    
  } catch (error) {
    console.error('Error:', error);
    displayErrorMessage();
  }
}

function displaySuccessMessage(paymentData) {
  const container = document.getElementById('message-container');
  container.innerHTML = `
    <div class="success-message">
      <h2>¡Pago Exitoso! ✅</h2>
      <p>Tu pago de $${(paymentData.amountTotal / 100).toFixed(2)} ${paymentData.currency.toUpperCase()} ha sido procesado correctamente.</p>
      <p>Recibirás un correo de confirmación en: ${paymentData.customerEmail}</p>
      <p>ID de transacción: ${paymentData.metadata.bookingId}</p>
      <button onclick="window.location.href='/bookings'">Ver mis reservas</button>
    </div>
  `;
}

function displayPendingMessage() {
  const container = document.getElementById('message-container');
  container.innerHTML = `
    <div class="pending-message">
      <h2>Pago Pendiente ⏳</h2>
      <p>Tu pago está siendo procesado. Te notificaremos cuando se complete.</p>
    </div>
  `;
}

function displayErrorMessage() {
  const container = document.getElementById('message-container');
  container.innerHTML = `
    <div class="error-message">
      <h2>Error en el Pago ❌</h2>
      <p>Hubo un problema al procesar tu pago. Por favor intenta de nuevo.</p>
      <button onclick="window.location.href='/checkout'">Reintentar</button>
    </div>
  `;
}

// Ejecutar al cargar la página
window.addEventListener('DOMContentLoaded', verifyPayment);
```

### 4. Página de Cancelación (Cancel)

```html
<!-- cancel.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Pago Cancelado</title>
</head>
<body>
  <div class="cancel-container">
    <h2>Pago Cancelado</h2>
    <p>Has cancelado el proceso de pago.</p>
    <p>Si fue un error, puedes intentar de nuevo.</p>
    <button onclick="window.location.href='/checkout'">
      Volver al Checkout
    </button>
    <button onclick="window.location.href='/'">
      Ir al Inicio
    </button>
  </div>
</body>
</html>
```

---

## 🎨 Ejemplo con React

### Componente de Checkout

```jsx
import React, { useState } from 'react';

function CheckoutButton({ bookingData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://tender-unity-production-dbba.up.railway.app/api/v1/payments/stripe/create-checkout-session',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: bookingData.totalAmount * 100,
            currency: 'mxn',
            description: `Reserva: ${bookingData.tourName}`,
            userId: bookingData.userId,
            customerEmail: bookingData.email,
            customerName: bookingData.name,
            metadata: {
              bookingId: bookingData.bookingId,
              tourId: bookingData.tourId,
              tourName: bookingData.tourName,
            },
            successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/payment/cancel`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al crear la sesión de pago');
      }

      const data = await response.json();
      
      // Redirigir a Stripe Checkout
      window.location.href = data.url;
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="checkout-button"
      >
        {loading ? 'Procesando...' : 'Proceder al Pago'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default CheckoutButton;
```

### Página de Éxito en React

```jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('No se encontró el ID de sesión');
      setLoading(false);
      return;
    }

    verifyPayment(sessionId);
  }, [searchParams]);

  const verifyPayment = async (sessionId) => {
    try {
      const response = await fetch(
        `https://tender-unity-production-dbba.up.railway.app/api/v1/payments/stripe/session-status?session_id=${sessionId}`
      );

      if (!response.ok) {
        throw new Error('Error al verificar el pago');
      }

      const data = await response.json();
      setPaymentData(data);
      
      // Actualizar estado de la reserva en tu sistema
      if (data.status === 'paid') {
        await updateBookingStatus(data.metadata.bookingId, 'paid');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    // Implementar tu lógica para actualizar la reserva
    console.log(`Actualizando reserva ${bookingId} a estado: ${status}`);
  };

  if (loading) {
    return <div>Verificando pago...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (paymentData?.status === 'paid') {
    return (
      <div className="success-container">
        <h2>¡Pago Exitoso! ✅</h2>
        <p>
          Tu pago de ${(paymentData.amountTotal / 100).toFixed(2)}{' '}
          {paymentData.currency.toUpperCase()} ha sido procesado correctamente.
        </p>
        <p>Email de confirmación: {paymentData.customerEmail}</p>
        <p>ID de reserva: {paymentData.metadata.bookingId}</p>
        <button onClick={() => window.location.href = '/bookings'}>
          Ver mis reservas
        </button>
      </div>
    );
  }

  return (
    <div className="pending-container">
      <h2>Pago Pendiente</h2>
      <p>Tu pago está siendo procesado.</p>
    </div>
  );
}

export default PaymentSuccess;
```

---

## 💰 Conversión de Montos

**IMPORTANTE:** Stripe trabaja con centavos, no con unidades.

```javascript
// Convertir de pesos a centavos
function toStripeAmount(amount) {
  return Math.round(amount * 100);
}

// Convertir de centavos a pesos
function fromStripeAmount(amount) {
  return amount / 100;
}

// Ejemplos:
toStripeAmount(100.50);    // 10050 centavos
toStripeAmount(1500);      // 150000 centavos
fromStripeAmount(10050);   // 100.50 pesos
fromStripeAmount(150000);  // 1500 pesos
```

---

## 🧪 Testing

### Tarjetas de Prueba

```javascript
const testCards = {
  success: '4242 4242 4242 4242',
  requiresAuth: '4000 0025 0000 3155',
  declined: '4000 0000 0000 9995',
  insufficientFunds: '4000 0000 0000 9995',
};

// Datos de prueba
const testData = {
  expiry: '12/34', // Cualquier fecha futura
  cvc: '123',      // Cualquier 3 dígitos
  zip: '12345',    // Cualquier 5 dígitos
};
```

---

## 🔐 Seguridad

### Buenas Prácticas

1. **Nunca expongas la clave secreta en el frontend**
   - Solo usa `STRIPE_PUBLISHABLE_KEY` en el frontend
   - La clave secreta debe estar solo en el backend

2. **Valida los datos antes de enviarlos**
   ```javascript
   function validateBookingData(data) {
     if (!data.email || !data.email.includes('@')) {
       throw new Error('Email inválido');
     }
     if (!data.totalAmount || data.totalAmount <= 0) {
       throw new Error('Monto inválido');
     }
     // Más validaciones...
   }
   ```

3. **Maneja errores apropiadamente**
   ```javascript
   try {
     await createCheckoutSession(bookingData);
   } catch (error) {
     // No mostrar detalles técnicos al usuario
     console.error('Error técnico:', error);
     alert('Hubo un problema al procesar tu pago. Por favor intenta de nuevo.');
   }
   ```

4. **Verifica siempre el estado del pago en el backend**
   - No confíes solo en la respuesta del frontend
   - Usa webhooks para confirmar pagos

---

## 📱 Responsive Design

Stripe Checkout es responsive por defecto, pero asegúrate de que tus páginas de éxito/cancelación también lo sean:

```css
.success-container,
.error-container,
.cancel-container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .success-container,
  .error-container,
  .cancel-container {
    margin: 20px;
    padding: 15px;
  }
}
```

---

## 🌐 Internacionalización

```javascript
// Configurar idioma según el usuario
const userLanguage = navigator.language || 'es-MX';

const messages = {
  'es-MX': {
    processingPayment: 'Procesando pago...',
    paymentSuccess: '¡Pago exitoso!',
    paymentError: 'Error en el pago',
  },
  'en-US': {
    processingPayment: 'Processing payment...',
    paymentSuccess: 'Payment successful!',
    paymentError: 'Payment error',
  }
};

function getMessage(key) {
  return messages[userLanguage]?.[key] || messages['es-MX'][key];
}
```

---

## 📊 Analytics

```javascript
// Trackear eventos de pago
function trackPaymentEvent(event, data) {
  // Google Analytics
  if (window.gtag) {
    gtag('event', event, {
      currency: 'MXN',
      value: data.amount,
      transaction_id: data.sessionId,
    });
  }
  
  // Facebook Pixel
  if (window.fbq) {
    fbq('track', event, {
      value: data.amount,
      currency: 'MXN',
    });
  }
}

// Uso:
trackPaymentEvent('begin_checkout', { amount: 1500 });
trackPaymentEvent('purchase', { amount: 1500, sessionId: 'cs_test_...' });
```

---

## 🆘 Manejo de Errores Comunes

```javascript
function handlePaymentError(error) {
  const errorMessages = {
    'card_declined': 'Tu tarjeta fue rechazada. Por favor intenta con otra.',
    'insufficient_funds': 'Fondos insuficientes. Por favor intenta con otra tarjeta.',
    'expired_card': 'Tu tarjeta ha expirado. Por favor usa otra tarjeta.',
    'incorrect_cvc': 'El código CVC es incorrecto.',
    'processing_error': 'Error al procesar el pago. Por favor intenta de nuevo.',
  };
  
  return errorMessages[error.code] || 'Hubo un error al procesar tu pago.';
}
```

---

**¡Listo para integrar!** 🚀

Si tienes dudas, consulta la [documentación oficial de Stripe](https://stripe.com/docs).
