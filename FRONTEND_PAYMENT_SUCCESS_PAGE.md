# 🎉 Página de Éxito de Pago - Frontend

## ✅ El Backend está funcionando correctamente

Tu pago de prueba fue exitoso. Stripe redirigió correctamente a:
```
https://www.moovadventures.com/payment/success?session_id=cs_test_a11NpMw8VD4Gcb3DsO5J9V8DvqghUNigdxEhSbXAG07Yk9WD1pkAbO2oNB
```

El problema es que tu frontend no tiene esta página creada (error 404).

---

## 📝 Solución: Crear la Página de Éxito

### Opción 1: React/Next.js

Crea el archivo: `pages/payment/success.jsx` o `app/payment/success/page.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation'; // Next.js 13+
// O para React Router: import { useSearchParams } from 'react-router-dom';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
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
      
      // Aquí puedes actualizar el estado de la reserva en tu sistema
      if (data.status === 'paid' && data.metadata?.bookingId) {
        // Llamar a tu API para actualizar la reserva
        await updateBookingStatus(data.metadata.bookingId, 'paid');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      // Implementa tu lógica para actualizar la reserva
      console.log(`Actualizando reserva ${bookingId} a estado: ${status}`);
      
      // Ejemplo:
      // await fetch(`/api/bookings/${bookingId}`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ status: 'paid' })
      // });
    } catch (error) {
      console.error('Error actualizando reserva:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (paymentData?.status === 'paid') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            ¡Pago Exitoso!
          </h2>
          <p className="text-gray-600 mb-6">
            Tu pago de{' '}
            <span className="font-bold text-green-600">
              ${(paymentData.amountTotal / 100).toFixed(2)}{' '}
              {paymentData.currency.toUpperCase()}
            </span>{' '}
            ha sido procesado correctamente.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Email de confirmación:</strong>
              <br />
              {paymentData.customerEmail}
            </p>
            {paymentData.metadata?.bookingId && (
              <p className="text-sm text-gray-600">
                <strong>ID de reserva:</strong>
                <br />
                {paymentData.metadata.bookingId}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/bookings'}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded"
            >
              Ver mis reservas
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="text-yellow-500 text-5xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Pago Pendiente
        </h2>
        <p className="text-gray-600 mb-6">
          Tu pago está siendo procesado. Te notificaremos cuando se complete.
        </p>
      </div>
    </div>
  );
}
```

### Opción 2: HTML/JavaScript Vanilla

Crea el archivo: `public/payment/success.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Exitoso - Moov Adventures</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }

    .icon {
      font-size: 80px;
      margin-bottom: 20px;
    }

    h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 15px;
    }

    .amount {
      color: #10b981;
      font-size: 36px;
      font-weight: bold;
      margin: 20px 0;
    }

    .info-box {
      background: #f3f4f6;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      text-align: left;
    }

    .info-box p {
      color: #666;
      margin: 10px 0;
      font-size: 14px;
    }

    .info-box strong {
      color: #333;
    }

    .button {
      display: inline-block;
      width: 100%;
      padding: 15px 30px;
      margin: 10px 0;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s;
    }

    .button-primary {
      background: #10b981;
      color: white;
    }

    .button-primary:hover {
      background: #059669;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
    }

    .button-secondary {
      background: #e5e7eb;
      color: #333;
    }

    .button-secondary:hover {
      background: #d1d5db;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .spinner {
      border: 4px solid #f3f4f6;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="container" id="content">
    <div class="loading">
      <div class="spinner"></div>
      <p>Verificando pago...</p>
    </div>
  </div>

  <script>
    // Obtener session_id de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      showError('No se encontró el ID de sesión');
    } else {
      verifyPayment(sessionId);
    }

    async function verifyPayment(sessionId) {
      try {
        const response = await fetch(
          `https://tender-unity-production-dbba.up.railway.app/api/v1/payments/stripe/session-status?session_id=${sessionId}`
        );

        if (!response.ok) {
          throw new Error('Error al verificar el pago');
        }

        const data = await response.json();

        if (data.status === 'paid') {
          showSuccess(data);
          
          // Actualizar estado de la reserva si existe bookingId
          if (data.metadata?.bookingId) {
            await updateBookingStatus(data.metadata.bookingId, 'paid');
          }
        } else if (data.status === 'unpaid') {
          showPending();
        } else {
          showError('Estado de pago desconocido');
        }

      } catch (error) {
        console.error('Error:', error);
        showError('Hubo un error al verificar el pago');
      }
    }

    async function updateBookingStatus(bookingId, status) {
      try {
        console.log(`Actualizando reserva ${bookingId} a estado: ${status}`);
        // Implementa tu lógica aquí
      } catch (error) {
        console.error('Error actualizando reserva:', error);
      }
    }

    function showSuccess(data) {
      const amount = (data.amountTotal / 100).toFixed(2);
      const currency = data.currency.toUpperCase();
      
      document.getElementById('content').innerHTML = `
        <div class="icon">✅</div>
        <h1>¡Pago Exitoso!</h1>
        <div class="amount">$${amount} ${currency}</div>
        <p style="color: #666; margin-bottom: 20px;">
          Tu pago ha sido procesado correctamente
        </p>
        
        <div class="info-box">
          <p><strong>Email de confirmación:</strong><br>${data.customerEmail}</p>
          ${data.metadata?.bookingId ? `<p><strong>ID de reserva:</strong><br>${data.metadata.bookingId}</p>` : ''}
        </div>

        <a href="/bookings" class="button button-primary">Ver mis reservas</a>
        <a href="/" class="button button-secondary">Volver al Inicio</a>
      `;
    }

    function showPending() {
      document.getElementById('content').innerHTML = `
        <div class="icon">⏳</div>
        <h1>Pago Pendiente</h1>
        <p style="color: #666; margin: 20px 0;">
          Tu pago está siendo procesado. Te notificaremos cuando se complete.
        </p>
        <a href="/" class="button button-secondary">Volver al Inicio</a>
      `;
    }

    function showError(message) {
      document.getElementById('content').innerHTML = `
        <div class="icon error">❌</div>
        <h1 class="error">Error</h1>
        <p style="color: #666; margin: 20px 0;">${message}</p>
        <a href="/" class="button button-secondary">Volver al Inicio</a>
      `;
    }
  </script>
</body>
</html>
```

---

## 🎨 Página de Cancelación

También necesitas crear la página de cancelación: `payment/cancel`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Cancelado - Moov Adventures</title>
  <style>
    /* Mismo CSS que arriba */
  </style>
</head>
<body>
  <div class="container">
    <div class="icon" style="color: #f59e0b;">⚠️</div>
    <h1>Pago Cancelado</h1>
    <p style="color: #666; margin: 20px 0;">
      Has cancelado el proceso de pago. Si fue un error, puedes intentar de nuevo.
    </p>
    <a href="/checkout" class="button button-primary">Volver al Checkout</a>
    <a href="/" class="button button-secondary">Ir al Inicio</a>
  </div>
</body>
</html>
```

---

## 🔧 Configuración de Rutas

### Next.js
Las páginas se crean automáticamente según la estructura de carpetas.

### React Router
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PaymentSuccess from './pages/payment/success';
import PaymentCancel from './pages/payment/cancel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        {/* Otras rutas */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## ✅ Resumen

1. **El backend está funcionando perfectamente** ✅
2. **El pago se procesó exitosamente** ✅
3. **Stripe redirigió correctamente** ✅
4. **Solo falta crear la página de éxito en el frontend** ⏳

Una vez que crees la página de éxito, todo funcionará correctamente.

---

## 🧪 Probar de Nuevo

Después de crear la página:

1. Hacer otro pago de prueba
2. Usar tarjeta: `4242 4242 4242 4242`
3. Completar el pago
4. Deberías ver la página de éxito con toda la información del pago

¡La migración a Stripe está casi completa! 🎉
