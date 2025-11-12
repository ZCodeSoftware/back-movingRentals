# Filtro de Envío de Emails por Source (Dashboard vs Web)

## Descripción

Se ha implementado un sistema de filtrado para el envío de emails de notificación basado en el origen (`source`) del contrato. Los emails solo se envían cuando las reservas provienen del **Dashboard** (lado de la tienda), y **NO** se envían cuando provienen de la **Web** (lado del cliente).

## Cambios Realizados

### 1. Controlador de Eventos de Notificación
**Archivo**: `src/notification/infrastructure/nest/controllers/notification.events.controller.ts`

Se modificaron los siguientes event handlers para verificar el `source` del contrato antes de enviar emails:

#### `@OnEvent('send-booking.created')`
- Busca el contrato asociado al booking
- Verifica el campo `source` del contrato
- Solo envía el email si `source === 'Dashboard'`
- Si `source === 'Web'`, no se envía el email

#### `@OnEvent('send-booking.cancelled')`
- Busca el contrato asociado al booking
- Verifica el campo `source` del contrato
- Solo envía el email de cancelación si `source === 'Dashboard'`
- Si `source === 'Web'`, no se envía el email de cancelación

#### `@OnEvent('send-booking.confirmed')`
- Busca el contrato asociado al booking
- Verifica el campo `source` del contrato
- Solo envía el email de confirmación si `source === 'Dashboard'`
- Si `source === 'Web'`, no se envía el email de confirmación

### 2. Servicio de Booking
**Archivo**: `src/booking/application/services/booking.service.ts`

Se agregaron comentarios explicativos en los métodos que emiten eventos de email para documentar que los emails solo se envían cuando el `source` es 'Dashboard':

- `create()`: Comentario agregado antes de emitir `send-booking.created`
- `addManualBookingInUserFromCart()`: Comentario agregado antes de emitir `send-booking.created`

## Lógica de Funcionamiento

### Flujo de Envío de Emails

```
1. Se crea/actualiza un booking
2. Se emite un evento (send-booking.created, send-booking.cancelled, send-booking.confirmed)
3. El NotificationEventController recibe el evento
4. Se busca el contrato asociado al booking
5. Se verifica el campo 'source' del contrato:
   
   Para send-booking.created:
   - Si source === 'Dashboard' → Se envía el email INMEDIATAMENTE ✅
   - Si source === 'Web' → Se envía el email SEGÚN LÓGICA DE PAGO ✅
     * Transferencia/Crédito/Débito/Efectivo: Solo cuando se confirma el pago
     * Otros métodos: Inmediatamente
   - Si no se encuentra contrato → Se envía el email (comportamiento por defecto) ✅
   
   Para send-booking.cancelled y send-booking.confirmed:
   - Si source === 'Dashboard' → Se envía el email ✅
   - Si source === 'Web' → NO se envía el email ⏸️
   - Si no se encuentra contrato → NO se envía el email ⚠️
```

### Valores del Campo `source`

El campo `source` en el schema de `Contract` puede tener dos valores:

- **'Dashboard'**: Indica que la reserva fue creada desde el panel de administración (tienda)
- **'Web'**: Indica que la reserva fue creada desde el sitio web (cliente)

Por defecto, si no se especifica, el valor es **'Web'**.

## Logs de Depuración

Se agregaron logs detallados para facilitar el debugging:

```typescript
// Cuando se encuentra un contrato
console.log(`[NotificationEventController] Contrato encontrado - source: ${source}`);

// Cuando se envía el email (Dashboard)
console.log('[NotificationEventController] ✅ Source es Dashboard - Enviando email');
console.log('[NotificationEventController] ✅ Email enviado exitosamente');

// Cuando NO se envía el email (Web)
console.log('[NotificationEventController] ⏸️ Source es Web - NO se envía email');

// Cuando no se encuentra contrato
console.log('[NotificationEventController] ⚠️ No se encontró contrato asociado - NO se envía email');
```

## Casos de Uso

### Caso 1: Reserva desde Dashboard (SIEMPRE envía email)
```
1. Usuario crea una reserva desde el panel de administración
2. Se crea el booking con source: 'Dashboard'
3. Se crea el contrato con source: 'Dashboard'
4. Se emite el evento send-booking.created INMEDIATAMENTE
5. El sistema verifica que source === 'Dashboard'
6. ✅ Se envía el email de confirmación al cliente INMEDIATAMENTE
```

### Caso 2: Reserva desde Web con Transferencia/Crédito/Débito/Efectivo
```
1. Cliente crea una reserva desde el sitio web con método de pago que requiere confirmación
2. Se crea el booking con source: 'Web'
3. Se crea el contrato con source: 'Web'
4. BookingService NO emite el evento send-booking.created (espera confirmación)
5. ⏸️ NO se envía email todavía
6. Cuando se confirma el pago (validateBooking):
   - Se emite el evento send-booking.created
   - El sistema verifica que source === 'Web'
   - ✅ Se envía el email de confirmación
```

### Caso 3: Reserva desde Web con otros métodos de pago
```
1. Cliente crea una reserva desde el sitio web con método de pago instantáneo
2. Se crea el booking con source: 'Web'
3. Se crea el contrato con source: 'Web'
4. BookingService emite el evento send-booking.created INMEDIATAMENTE
5. El sistema verifica que source === 'Web'
6. ✅ Se envía el email de confirmación INMEDIATAMENTE
```

### Caso 4: Cancelación desde Dashboard
```
1. Usuario cancela una reserva desde el panel de administración
2. Se emite el evento send-booking.cancelled
3. El sistema verifica que source === 'Dashboard'
4. ✅ Se envía el email de cancelación al cliente
```

### Caso 5: Cancelación desde Web
```
1. Cliente cancela una reserva desde el sitio web
2. Se emite el evento send-booking.cancelled
3. El sistema verifica que source === 'Web'
4. ⏸️ NO se envía el email de cancelación
```

## Compatibilidad con Código Existente

Los cambios son **retrocompatibles**:

- Si un contrato no tiene el campo `source`, se asume `'Web'` por defecto
- Los eventos de email siguen funcionando igual, solo se agrega la verificación del `source`
- No se requieren cambios en otros módulos del sistema

## Tipos de Emails Afectados

Los siguientes tipos de emails están sujetos al filtro por `source`:

1. **Email de Confirmación de Reserva** (`send-booking.created`)
   - Se envía cuando se crea una reserva
   - Se envía cuando se valida un pago

2. **Email de Cancelación de Reserva** (`send-booking.cancelled`)
   - Se envía cuando se cancela una reserva

3. **Email de Confirmación de Reserva** (`send-booking.confirmed`)
   - Se envía cuando se confirma una reserva (de reserva a booking completo)

## Notas Importantes

1. **Lógica de Confirmación de Pago (Web)**: 
   - Para reservas de Web, se mantiene la lógica original del `BookingService`
   - Métodos que requieren confirmación (Transferencia/Crédito/Débito/Efectivo): Email solo cuando se confirma el pago
   - Otros métodos de pago: Email inmediato

2. **Dashboard siempre envía emails**: 
   - Las reservas desde Dashboard SIEMPRE envían emails inmediatamente
   - No importa el método de pago, el email se envía al crear la reserva

3. **Cancelaciones y Confirmaciones**:
   - `send-booking.cancelled`: Solo Dashboard envía emails
   - `send-booking.confirmed`: Solo Dashboard envía emails
   - Web NO envía estos tipos de emails

4. **Contratos sin `source`**: 
   - Si un contrato no tiene el campo `source` definido, se asume que es `'Web'`
   - Para `send-booking.created`: Se envía el email (mantiene lógica de pago)
   - Para `send-booking.cancelled` y `send-booking.confirmed`: NO se envían emails

5. **Bookings sin Contrato**: 
   - Para `send-booking.created`: Se envía el email (comportamiento por defecto)
   - Para `send-booking.cancelled` y `send-booking.confirmed`: NO se envían emails

6. **Logs Detallados**: Todos los eventos de email generan logs detallados para facilitar el debugging y monitoreo.

7. **Manejo de Errores**: Los errores en el envío de emails se capturan y registran, pero no interrumpen el flujo principal de la aplicación.

## Testing

Para probar la funcionalidad:

### Test 1: Reserva desde Dashboard (Email Inmediato)
```bash
# Crear una reserva con source: 'Dashboard'
POST /contract
{
  "source": "Dashboard",
  "booking": {...},
  ...
}

# Verificar en los logs:
# ✅ [NotificationEventController] Source es Dashboard - Enviando email inmediatamente
```

### Test 2: Reserva desde Web con Transferencia (Email al Confirmar)
```bash
# Crear una reserva con source: 'Web' y método de pago Transferencia
POST /contract
{
  "source": "Web",
  "booking": {
    "paymentMethod": "Transferencia",
    ...
  },
  ...
}

# Verificar en los logs al crear:
# ⏸️ [BookingService] Email NO enviado - método de pago requiere confirmación

# Luego confirmar el pago:
POST /booking/:id/validate
{
  "paid": true,
  ...
}

# Verificar en los logs al confirmar:
# 📧 [NotificationEventController] Source es Web - Enviando email según lógica de confirmación de pago
# ✅ [NotificationEventController] Email enviado exitosamente
```

### Test 3: Cancelación desde Dashboard
```bash
# Cancelar una reserva con source: 'Dashboard'
POST /booking/:id/cancel

# Verificar en los logs:
# ✅ [NotificationEventController] Source es Dashboard - Enviando email de cancelación
```

### Test 4: Cancelación desde Web
```bash
# Cancelar una reserva con source: 'Web'
POST /booking/:id/cancel

# Verificar en los logs:
# ⏸️ [NotificationEventController] Source es Web - NO se envía email de cancelación
```

## Mantenimiento Futuro

Si se necesita modificar la lógica de envío de emails:

1. Editar el archivo `notification.events.controller.ts`
2. Modificar la condición `if (source === 'Dashboard')`
3. Agregar logs apropiados para debugging
4. Actualizar este README con los cambios

## Autor

Implementado como parte de la mejora del sistema de notificaciones para diferenciar entre reservas del Dashboard y de la Web.

## Fecha

Diciembre 2024
