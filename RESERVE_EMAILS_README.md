# Sistema de Emails para Reservas Pendientes y Confirmadas

## Descripción General

Se ha implementado un sistema de notificaciones por email que diferencia entre **reservas pendientes** (isReserve = true) y **reservas confirmadas** (isReserve = false). El sistema envía emails tanto al usuario como al administrador (tienda) en ambos idiomas (español e inglés).

**Filosofía del sistema**: 
- **Reservas Pendientes**: Información mínima esencial enfocada en facilitar el contacto y la confirmación
- **Reservas Confirmadas**: Información completa con todos los detalles necesarios para disfrutar la experiencia

## Características Principales

### 1. Reservas Pendientes (isReserve = true)

Cuando se crea una reserva con `isReserve: true`, el sistema envía emails **concisos con información mínima esencial**:

#### Email al Usuario:
- **Asunto**: "Reserva Pendiente #[número] - MoovAdventures"
- **Contenido mínimo esencial**:
  - ⚠️ Alerta: Reserva pendiente de confirmación
  - Número de reserva y estado (PENDIENTE)
  - Cliente
  - Lista resumida de items solicitados (formato lista simple)
  - **Información de pago destacada**:
    - Total de la reserva
    - Anticipo pagado
    - **Saldo pendiente** (destacado en rojo)
    - Método de pago
    - Medio de pago
  - **Información de contacto completa para confirmar**:
    - WhatsApp
    - Email
    - Dirección física
    - Horario de atención
  - Nota: "Una vez confirmado el pago, recibirás un email con todos los detalles completos"

#### Email al Admin (Tienda):
- **Asunto**: "⚠️ Reserva PENDIENTE #[número] - Requiere Confirmación"
- **Contenido mínimo esencial**:
  - 🔔 Alerta de acción requerida
  - Información de la reserva (número, estado, cliente, email, teléfono, hotel)
  - Lista resumida de items solicitados (formato lista simple)
  - **Información de pago destacada**:
    - Total de la reserva
    - Anticipo pagado
    - **Saldo pendiente** (destacado en rojo grande)
    - Método y medio de pago
    - Nota de depósito (si existe)
  - **Información de contacto de la tienda** (para que el admin sepa qué compartir con el cliente)
  - **Próximos pasos claros**:
    1. Contactar al cliente
    2. Coordinar pago del saldo pendiente
    3. Aprobar reserva en el sistema
    4. El cliente recibirá email automático con detalles completos

### 2. Reservas Confirmadas (isReserve = false)

Cuando se crea una reserva con `isReserve: false` o cuando una reserva pendiente se confirma, el sistema envía emails completos:

#### Email al Usuario:
- **Asunto**: "Tu reserva #[número] en MoovAdventures está confirmada! 🚀"
- **Contenido completo**:
  - Detalles generales de la reserva
  - Información detallada de cada vehículo (fechas, horarios, precios, días de renta)
  - Información de servicios adicionales disponibles
  - Información de delivery (si aplica)
  - Resumen de pago completo
  - Información de retiro/entrega
  - Datos de contacto y ubicación

#### Email al Admin (Tienda):
- **Asunto**: "Nueva Reserva #[número]"
- **Contenido**:
  - Información completa del cliente
  - Detalles de todos los items reservados
  - Información de delivery (si aplica)
  - Resumen de pago completo
  - Ubicación de la sucursal

### 3. Confirmación de Reserva Pendiente

Cuando una reserva pendiente cambia de `isReserve: true` a `isReserve: false`, se dispara automáticamente el evento `send-booking.confirmed` que envía los emails completos de confirmación tanto al usuario como al administrador.

## Archivos Creados/Modificados

### Nuevas Plantillas de Email

1. **Para Usuarios**:
   - `src/notification/infrastructure/provider/user-email/user-booking-reserve.template.ts` (Español)
   - `src/notification/infrastructure/provider/user-email/user-booking-reserve-en.template.ts` (Inglés)

2. **Para Administradores**:
   - `src/notification/infrastructure/provider/admin-email/admin-booking-reserve.template.ts`

### Archivos Modificados

1. **Providers**:
   - `src/notification/infrastructure/provider/user-email/user-email.provider.ts`
   - `src/notification/infrastructure/provider/admin-email/admin-email.provider.ts`

2. **Servicios**:
   - `src/notification/application/services/notification.event.service.ts`
   - `src/notification/domain/services/notificacion.event.interface.service.ts`

3. **Controladores**:
   - `src/notification/infrastructure/nest/controllers/notification.events.controller.ts`

## Flujo de Trabajo

### Escenario 1: Crear Reserva Pendiente
```typescript
// Al crear una reserva con isReserve: true
POST /booking
{
  "isReserve": true,
  "total": 1000,
  "totalPaid": 300,
  // ... otros datos
}

// Se dispara automáticamente:
// 1. Evento: 'send-booking.created'
// 2. Se detecta isReserve = true
// 3. Se envían emails MÍNIMOS de reserva pendiente
//    - Al usuario: Info esencial + contacto para confirmar
//    - Al admin: Info esencial + acción requerida
```

### Escenario 2: Confirmar Reserva Pendiente
```typescript
// Al actualizar una reserva pendiente y cambiar isReserve a false
// (Esto se hace típicamente en el método confirmReservation)
PUT /booking/:id/confirm

// Se dispara automáticamente:
// 1. Evento: 'send-booking.confirmed'
// 2. Se envían emails COMPLETOS de confirmación
//    - Al usuario: Todos los detalles de la reserva
//    - Al admin: Información completa de la reserva confirmada
```

### Escenario 3: Crear Reserva Directa (sin pendiente)
```typescript
// Al crear una reserva con isReserve: false o sin especificar
POST /booking
{
  "isReserve": false,
  "total": 1000,
  "totalPaid": 1000,
  // ... otros datos
}

// Se dispara automáticamente:
// 1. Evento: 'send-booking.created'
// 2. Se detecta isReserve = false
// 3. Se envían emails COMPLETOS de confirmación
//    - Al usuario: Todos los detalles de la reserva
//    - Al admin: Información completa de la reserva
```

## Eventos Disponibles

### 1. `send-booking.created`
- **Cuándo**: Al crear una nueva reserva (pendiente o confirmada)
- **Payload**:
  ```typescript
  {
    updatedBooking: BookingModel,
    userEmail: string,
    lang: string // 'es' o 'en'
  }
  ```
- **Comportamiento**: Detecta automáticamente si es pendiente o confirmada y envía el email correspondiente

### 2. `send-booking.confirmed`
- **Cuándo**: Al confirmar una reserva pendiente (cambiar isReserve de true a false)
- **Payload**:
  ```typescript
  {
    booking: BookingModel,
    userEmail: string,
    lang: string // 'es' o 'en'
  }
  ```
- **Comportamiento**: Envía siempre los emails completos de confirmación

### 3. `send-booking.cancelled`
- **Cuándo**: Al cancelar una reserva
- **Payload**:
  ```typescript
  {
    booking: BookingModel,
    userEmail: string,
    lang: string // 'es' o 'en'
  }
  ```
- **Comportamiento**: Envía emails de cancelación

## Soporte Multiidioma

Todos los emails soportan español e inglés:
- **Español**: `lang: 'es'` (por defecto)
- **Inglés**: `lang: 'en'`

El idioma se determina automáticamente según la configuración del usuario o se puede especificar manualmente al emitir el evento.

## Información Incluida en los Emails

### Reserva Pendiente (Versión Mínima - isReserve = true)
**Enfoque**: Información esencial para que el cliente y la tienda puedan contactarse y confirmar

✅ **Incluye**:
- Número de reserva y estado (PENDIENTE)
- Cliente (nombre completo)
- Items solicitados (lista simple: nombre, días/fecha, precio)
- **Información de pago completa y destacada**:
  - Total de la reserva
  - Anticipo pagado
  - **Saldo pendiente** (en rojo, grande)
  - Método de pago
  - Medio de pago
  - Nota de depósito (si existe)
- **Información de contacto completa y visible**:
  - WhatsApp (con link directo)
  - Email
  - Dirección física
  - Horario de atención
- Próximos pasos claros

❌ **NO incluye** (se envía después al confirmar):
- Detalles extensos de cada servicio
- Información de entrega/devolución detallada
- Servicios adicionales disponibles
- Horarios específicos de pickup
- Instrucciones detalladas
- Políticas y requisitos

### Reserva Confirmada (Versión Completa - isReserve = false)
**Enfoque**: Toda la información necesaria para que el cliente disfrute su experiencia

✅ **Incluye TODO**:
- Número de reserva
- Información completa del cliente
- Detalles extensos de cada item:
  - Vehículos: fechas, horarios, precios por día, días totales, información de entrega/devolución
  - Transfers: servicio, fecha, cantidad, precio
  - Tours: nombre, fecha, cantidad, precio
  - Tickets: nombre, fecha, cantidad, precio
- Información de delivery completa (si aplica)
- Servicios adicionales disponibles (con precios)
- Información de entrega/devolución detallada
- Ubicación y horarios de sucursal (con mapa)
- Información de contacto
- Instrucciones importantes
- Políticas y requisitos

## Ejemplo de Uso en Código

```typescript
// En booking.service.ts

// Crear reserva pendiente
async addManualBookingInUserFromCart(email: string, body: any, lang: string = 'es') {
  // ... lógica de creación ...
  
  // Emitir evento con isReserve = true
  this.eventEmitter.emit('send-booking.created', {
    updatedBooking: bookingSave,
    userEmail: email,
    lang,
  });
  
  // Se enviarán automáticamente emails MÍNIMOS de reserva pendiente
}

// Confirmar reserva pendiente
async confirmReservation(id: string, email: string, lang: string = 'es') {
  // ... lógica de confirmación ...
  // booking.confirmReservation() cambia isReserve a false
  
  // Emitir evento de confirmación
  this.eventEmitter.emit('send-booking.confirmed', {
    booking: updatedBooking,
    userEmail,
    lang,
  });
  
  // Se enviarán automáticamente emails COMPLETOS de confirmación
}
```

## Ventajas del Sistema

1. **Claridad y Concisión**: 
   - Emails pendientes: Solo información esencial para contactar y confirmar
   - Emails confirmados: Información completa para disfrutar la experiencia
   
2. **Enfoque en la Acción**:
   - Emails pendientes destacan el saldo pendiente y cómo contactar
   - Información de contacto completa y visible
   - Próximos pasos claros para ambas partes

3. **Automatización**: No requiere intervención manual para enviar emails

4. **Multiidioma**: Soporte completo para español e inglés

5. **Escalabilidad**: Fácil agregar nuevos tipos de notificaciones

6. **Mantenibilidad**: Código organizado y separado por responsabilidades

7. **Trazabilidad**: Logs detallados de cada envío de email

8. **Experiencia del Usuario**:
   - No abrumar con información innecesaria en estado pendiente
   - Proporcionar toda la información cuando realmente se necesita (confirmación)
   - Facilitar el contacto inmediato entre cliente y tienda

9. **Eficiencia Operativa**:
   - Admin recibe solo la información necesaria para tomar acción
   - Saldo pendiente destacado visualmente
   - Pasos claros para procesar la reserva

## Notas Técnicas

- Los emails se envían usando **Brevo** (anteriormente Sendinblue)
- Se implementa **deduplicación** para evitar envíos duplicados en 1 minuto
- Los emails incluyen **tags** para tracking y análisis:
  - Pendientes: `booking-reserve`
  - Confirmados: `booking-confirmation`
- Se implementan **reintentos automáticos** en caso de fallo temporal
- Los errores en emails al admin no bloquean el proceso (NON-CRITICAL)
- Los errores en emails al usuario sí bloquean el proceso (CRITICAL)

## Configuración Requerida

Asegúrate de tener configurada la variable de entorno:
```
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
```

## Testing

Para probar el sistema:

1. **Reserva Pendiente**:
   ```bash
   POST /booking
   {
     "isReserve": true,
     "totalPaid": 300,
     "total": 1000
   }
   # Resultado: Emails MÍNIMOS con info esencial + contacto
   ```

2. **Confirmar Reserva Pendiente**:
   ```bash
   POST /booking/:id/confirm
   # Resultado: Emails COMPLETOS con todos los detalles
   ```

3. **Reserva Directa (Confirmada)**:
   ```bash
   POST /booking
   {
     "isReserve": false,
     "totalPaid": 1000,
     "total": 1000
   }
   # Resultado: Emails COMPLETOS con todos los detalles
   ```

## Diferencias Clave: Pendiente vs Confirmada

| Aspecto | Pendiente (isReserve=true) | Confirmada (isReserve=false) |
|---------|---------------------------|------------------------------|
| **Objetivo** | Facilitar contacto y confirmación | Proporcionar info completa para la experiencia |
| **Longitud** | Corto y conciso | Completo y detallado |
| **Información de pago** | Destacada (saldo pendiente en rojo) | Completa pero no destacada |
| **Contacto** | Muy visible y destacado | Presente pero no prioritario |
| **Detalles de servicio** | Lista simple | Detalles extensos |
| **Servicios adicionales** | No incluidos | Incluidos con precios |
| **Instrucciones** | Mínimas | Completas |
| **Tono** | Urgente (acción requerida) | Informativo (todo listo) |

## Soporte

Para cualquier duda o problema con el sistema de emails, revisar los logs del servidor que incluyen información detallada de cada envío.
