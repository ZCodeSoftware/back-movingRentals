# Funcionalidad de Cancelación de Reservas

## Resumen
Se ha implementado una funcionalidad completa para cancelar reservas que incluye:
- Endpoint REST para cancelar reservas
- Sistema de notificaciones por email al usuario y administrador
- Nuevo estado "CANCELADO" en el sistema
- Plantillas de email en español e inglés

## Cambios Implementados

### 1. Nuevo Estado CANCELADO
**Archivo:** `src/core/domain/enums/type-status.enum.ts`
- Se agregó `CANCELLED = "CANCELADO"` al enum TypeStatus

### 2. Endpoint de Cancelación
**Archivo:** `src/booking/infrastructure/nest/controllers/booking.controller.ts`
- **Endpoint:** `PUT /booking/cancel/:id`
- **Método:** `cancelBooking()`
- **Autenticación:** Requiere token JWT
- **Parámetros:**
  - `id` (path): ID de la reserva a cancelar
  - `lang` (query, opcional): Idioma para las notificaciones ('es' o 'en')

### 3. Lógica de Negocio
**Archivo:** `src/booking/application/services/booking.service.ts`
- **Método:** `cancelBooking(id, email, lang)`
- **Validaciones:**
  - Verifica que la reserva existe
  - Verifica que no esté ya cancelada
  - Actualiza el estado a CANCELADO
  - Emite evento para envío de emails

### 4. Interfaces Actualizadas
**Archivos modificados:**
- `src/booking/domain/services/booking.interface.service.ts`
- `src/notification/domain/adapter/user-email.interface.adapter.ts`
- `src/notification/domain/adapter/admin-email.interface.adapter.ts`
- `src/notification/domain/services/notificacion.event.interface.service.ts`

### 5. Sistema de Emails

#### Plantillas de Usuario
- **Español:** `src/notification/infrastructure/provider/user-email/user-booking-cancelled.template.ts`
- **Inglés:** `src/notification/infrastructure/provider/user-email/user-booking-cancelled-en.template.ts`

#### Plantilla de Administrador
- **Archivo:** `src/notification/infrastructure/provider/admin-email/admin-booking-cancelled.template.ts`

#### Proveedores de Email
- **Usuario:** `src/notification/infrastructure/provider/user-email/user-email.provider.ts`
  - Método: `sendUserBookingCancelled()`
- **Admin:** `src/notification/infrastructure/provider/admin-email/admin-email.provider.ts`
  - Método: `sendAdminBookingCancelled()`

### 6. Servicio de Eventos
**Archivo:** `src/notification/application/services/notification.event.service.ts`
- **Método:** `sendBookingCancelled()`
- **Evento:** `send-booking.cancelled`

### 7. Controlador de Eventos
**Archivo:** `src/notification/infrastructure/nest/controllers/notification.events.controller.ts`
- **Manejador:** `@OnEvent('send-booking.cancelled')`

## Uso del Endpoint

### Solicitud
```http
PUT /booking/cancel/{bookingId}?lang=es
Authorization: Bearer {jwt_token}
```

### Respuesta Exitosa
```json
{
  "_id": "booking_id",
  "cart": "...",
  "status": {
    "name": "CANCELADO",
    "_id": "status_id"
  },
  "paymentMethod": {...},
  "total": 1000,
  "bookingNumber": 12345,
  "isValidated": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

### Errores Posibles
- **404:** Reserva no encontrada
- **400:** Reserva ya está cancelada
- **401:** Token de autenticación inválido

## Flujo de Cancelación

1. **Usuario hace solicitud** → Endpoint `PUT /booking/cancel/:id`
2. **Validaciones** → Reserva existe y no está cancelada
3. **Actualización** → Estado cambia a CANCELADO
4. **Evento** → Se emite `send-booking.cancelled`
5. **Emails** → Se envían notificaciones al usuario y admin
6. **Respuesta** → Se retorna la reserva actualizada

## Emails Enviados

### Al Usuario
- **Asunto:** "Reserva Cancelada - #{bookingNumber}"
- **Contenido:** Detalles de la reserva cancelada, información de contacto
- **Idiomas:** Español e Inglés

### Al Administrador
- **Asunto:** "🚨 Reserva Cancelada - #{bookingNumber}"
- **Contenido:** Información del cliente, detalles de la reserva, acción requerida
- **Idioma:** Español

## Consideraciones de Seguridad

- Solo usuarios autenticados pueden cancelar reservas
- El sistema verifica que la reserva no esté ya cancelada
- Se registran logs detallados del proceso
- Los emails incluyen información de contacto para soporte

## Configuración Requerida

Asegúrate de que las siguientes variables de entorno estén configuradas:
- `NODEMAILER_USER`: Email para envío de notificaciones
- `NODEMAILER_PASSWORD`: Contraseña del email
- `BUSINESS_CONTACT_EMAIL`: Email de contacto del negocio

## Testing

Para probar la funcionalidad:

1. **Crear una reserva** usando el endpoint existente
2. **Cancelar la reserva** usando el nuevo endpoint
3. **Verificar emails** en las bandejas de entrada
4. **Comprobar estado** consultando la reserva

## Próximas Mejoras Sugeridas

1. **Políticas de cancelación** - Implementar reglas de tiempo límite
2. **Reembolsos automáticos** - Integrar con sistemas de pago
3. **Notificaciones push** - Agregar notificaciones móviles
4. **Auditoría** - Registrar quién canceló la reserva
5. **Cancelación masiva** - Endpoint para cancelar múltiples reservas