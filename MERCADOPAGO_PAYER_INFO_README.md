# Información del Comprador en Mercado Pago

## Descripción

Mercado Pago recomienda enviar información adicional del comprador (`payer.first_name` y `payer.last_name`) en las preferencias de pago para mejorar la tasa de aprobación. Esta información permite optimizar la validación de seguridad de los pagos y disminuir las probabilidades de rechazo por parte del motor de prevención de fraude.

## Beneficios

- **+5 puntos** por enviar `payer.first_name`
- **+5 puntos** por enviar `payer.last_name`
- **Total: +10 puntos** en la calificación de calidad de integración
- Mejora la tasa de aprobación de pagos
- Reduce rechazos por fraude

## Implementación

### Obtención Automática de Datos del Usuario

El servicio de pagos ahora obtiene automáticamente la información del usuario autenticado si se proporciona el `userId` en el request:

```typescript
// El servicio busca automáticamente:
// - payer.first_name -> userData.name
// - payer.last_name -> userData.lastName
// - payer.email -> userData.email
// - payer.phone -> userData.cellphone (si está disponible)
```

### Uso desde el Frontend

#### Opción 1: Enviar userId (Recomendado)

```javascript
const createPayment = async (userId) => {
  const response = await fetch('/payments/mercadopago', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId, // El backend buscará automáticamente la info del usuario
      items: [
        {
          title: 'Renta de vehículo',
          quantity: 1,
          unit_price: 1000,
        }
      ],
      back_urls: {
        success: 'https://tu-sitio.com/success',
        failure: 'https://tu-sitio.com/failure',
        pending: 'https://tu-sitio.com/pending',
      },
      auto_return: 'approved',
    }),
  });
  
  const preferenceId = await response.json();
  return preferenceId;
};
```

#### Opción 2: Enviar datos del payer manualmente

```javascript
const createPayment = async (userData) => {
  const response = await fetch('/payments/mercadopago', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payer: {
        first_name: userData.name,
        last_name: userData.lastName,
        email: userData.email,
        phone: {
          area_code: '',
          number: userData.cellphone,
        },
      },
      items: [
        {
          title: 'Renta de vehículo',
          quantity: 1,
          unit_price: 1000,
        }
      ],
      back_urls: {
        success: 'https://tu-sitio.com/success',
        failure: 'https://tu-sitio.com/failure',
        pending: 'https://tu-sitio.com/pending',
      },
      auto_return: 'approved',
    }),
  });
  
  const preferenceId = await response.json();
  return preferenceId;
};
```

#### Opción 3: Enviar nombre completo (Fallback)

Si solo tienes el nombre completo, el backend lo dividirá automáticamente:

```javascript
const createPayment = async () => {
  const response = await fetch('/payments/mercadopago', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payer: {
        name: 'Juan Pérez', // Se dividirá en first_name y last_name
        email: 'juan@example.com',
      },
      items: [
        {
          title: 'Renta de vehículo',
          quantity: 1,
          unit_price: 1000,
        }
      ],
    }),
  });
  
  const preferenceId = await response.json();
  return preferenceId;
};
```

## Flujo de Datos

1. **Frontend envía request** con `userId` o datos del `payer`
2. **Backend verifica** si faltan datos del comprador
3. **Si viene userId**: Busca el usuario en la base de datos y completa automáticamente:
   - `payer.first_name` con `user.name`
   - `payer.last_name` con `user.lastName`
   - `payer.email` con `user.email`
   - `payer.phone` con `user.cellphone`
4. **Si viene payer.name**: Divide el nombre completo en nombre y apellido
5. **Crea la preferencia** en Mercado Pago con todos los datos completos

## Campos Adicionales Implementados

Además de la información del comprador, el servicio también agrega automáticamente:

- ✅ `notification_url` - URL para recibir notificaciones de Mercado Pago (14 puntos)
- ✅ `external_reference` - Referencia única de la transacción (17 puntos)
- ✅ `items[].category_id` - Categoría del producto/servicio (4 puntos)
- ✅ `items[].id` - ID único del item (4 puntos)
- ✅ `payer.first_name` - Nombre del comprador (5 puntos)
- ✅ `payer.last_name` - Apellido del comprador (5 puntos)
- ✅ `payer.email` - Email del comprador
- ✅ `payer.phone` - Teléfono del comprador

**Total de puntos ganados: 49 puntos**

## Ejemplo Completo de Request

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "title": "Renta de Toyota Corolla",
      "description": "Renta por 3 días",
      "quantity": 1,
      "unit_price": 1500,
      "currency_id": "ARS"
    }
  ],
  "back_urls": {
    "success": "https://tu-sitio.com/success",
    "failure": "https://tu-sitio.com/failure",
    "pending": "https://tu-sitio.com/pending"
  },
  "auto_return": "approved",
  "statement_descriptor": "MOVING RENTALS"
}
```

## Respuesta del Backend

El backend devuelve el `preferenceId` que se usa para inicializar el checkout de Mercado Pago:

```json
"1234567890-abcd-1234-efgh-567890abcdef"
```

## Notas Importantes

- Si el usuario no está autenticado, asegúrate de enviar los datos del `payer` manualmente
- El campo `userId` debe ser el ID del usuario en MongoDB
- Si no se proporciona `userId` ni datos del `payer`, el sistema intentará dividir `payer.name` si está disponible
- Los datos del usuario se obtienen de forma segura desde la base de datos, no del frontend

## Documentación de Mercado Pago

Para más información sobre las mejores prácticas de integración:
- [Preferencias de Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/checkout-customization/preferences)
- [Calidad de Integración](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-quality)
