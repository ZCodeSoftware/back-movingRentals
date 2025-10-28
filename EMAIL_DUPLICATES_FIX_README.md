# Fix: Problema de Emails Duplicados y en Múltiples Idiomas

## Problemas Identificados

### 1. Emails Duplicados
**Causa**: Cuando se creaba un contrato, se emitían DOS eventos que enviaban emails de confirmación:
- `send-booking.created` - Emitido desde `booking.service.ts`
- `send-contract.created` - Emitido desde `contract.service.ts`, que a su vez llamaba a `sendBookingCreated`

Esto causaba que se enviaran emails duplicados tanto al cliente como al administrador.

### 2. Emails en Dos Idiomas (Español e Inglés)
**Causa**: El parámetro `lang` no estaba sincronizado entre diferentes puntos de emisión:
- En `booking.service.ts` se emitía con el `lang` del request
- En `contract.service.ts` se emitía con `lang: 'es'` hardcodeado

Esto causaba que se enviaran dos emails: uno en español y otro en inglés para la misma reserva.

### 3. Información Incompleta en Emails del Admin
**Causa**: Algunas veces faltaba información del usuario en los emails del admin porque no se estaba pasando el objeto `userData` correctamente.

## Soluciones Implementadas

### 1. Eliminación del Envío Duplicado desde Contratos

**Archivo**: `src/notification/infrastructure/nest/controllers/notification.events.controller.ts`

**Cambio**: El evento `send-contract.created` ya NO envía emails. Solo registra un log indicando que el email ya fue enviado cuando se creó el booking.

```typescript
@OnEvent('send-contract.created')
async contractCreate(payload: {
  contract: ContractModel;
  userEmail: string;
  lang: string;
}) {
  const { contract, userEmail, lang } = payload;
  try {
    // NOTA: No enviamos email aquí porque ya se envió cuando se creó el booking
    // Este evento se mantiene para posibles notificaciones futuras específicas de contratos
    console.log(`[NotificationEventController] Evento send-contract.created recibido para contrato. Email ya enviado en booking.created`);
    
    // Si en el futuro necesitamos enviar un email específico de contrato (diferente al de booking),
    // podemos implementarlo aquí
  } catch (error) {
    console.error('Error handling contract creation event:', error);
  }
}
```

**Archivo**: `src/contract/application/services/contract.service.ts`

**Cambio**: Ya no se emite el evento `send-contract.created` para evitar duplicados.

```typescript
const contractModel = ContractModel.create(processedContract);
const createdContract = await this.contractRepository.create(contractModel, userId);

// NOTA: Ya no emitimos el evento send-contract.created porque causa emails duplicados
// El email de confirmación ya se envió cuando se creó el booking
console.log('[ContractService] Contrato creado. Email de confirmación ya enviado en booking.created');

return createdContract;
```

### 2. Sistema de Deduplicación

**Archivo**: `src/notification/application/services/notification.event.service.ts`

**Implementación**: Se agregó un sistema de deduplicación que previene el envío de emails duplicados dentro de una ventana de tiempo de 1 minuto.

```typescript
@Injectable()
export class NotificationEventService implements INotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);
  private readonly sentEmails = new Map<string, number>(); // bookingId-lang -> timestamp
  private readonly DEDUP_WINDOW_MS = 60000; // 1 minuto de ventana de deduplicación

  constructor(...) {
    // Limpiar el mapa de emails enviados cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.sentEmails.entries()) {
        if (now - timestamp > this.DEDUP_WINDOW_MS) {
          this.sentEmails.delete(key);
        }
      }
    }, 300000); // 5 minutos
  }

  async sendBookingCreated(booking: BookingModel, userEmail: string, lang: string = 'es'): Promise<any> {
    const bookingData = booking.toJSON ? booking.toJSON() : booking;
    const bookingId = typeof bookingData._id === 'string' ? bookingData._id : String(bookingData._id);
    const bookingIdForLogs = bookingData.bookingNumber || bookingId;

    // Verificar si ya se envió un email para esta reserva recientemente
    const dedupKey = `${bookingId}-${lang}`;
    const lastSent = this.sentEmails.get(dedupKey);
    const now = Date.now();
    
    if (lastSent && (now - lastSent) < this.DEDUP_WINDOW_MS) {
      this.logger.warn(
        `[Reserva #${bookingIdForLogs}] Email duplicado detectado. Ya se envió hace ${Math.round((now - lastSent) / 1000)}s. Ignorando.`,
      );
      return { skipped: true, reason: 'duplicate', lastSent };
    }

    // Registrar este envío
    this.sentEmails.set(dedupKey, now);
    
    // ... resto del código de envío
  }
}
```

**Características**:
- Usa una clave compuesta `bookingId-lang` para detectar duplicados
- Ventana de deduplicación de 1 minuto
- Limpieza automática del mapa cada 5 minutos para evitar memory leaks
- Logs claros cuando se detecta un duplicado

### 3. Mejora en el Paso de Información del Usuario

**Archivo**: `src/notification/application/services/notification.event.service.ts`

**Cambio**: Se obtiene la información del usuario ANTES de enviar los emails y se pasa a ambos adaptadores (usuario y admin).

```typescript
// Obtener información del usuario para el email (fuera del try para que esté disponible para ambos emails)
let userData = null;
try {
  const bookingData = booking.toJSON();
  const bookingId = typeof bookingData._id === 'string' ? bookingData._id : String(bookingData._id);
  const user = await this.findUserByBookingId(bookingId);
  if (user) {
    userData = user.toJSON();
  }
} catch (error) {
  this.logger.warn(`[Reserva #${bookingIdForLogs}] No se pudo obtener información del usuario: ${error.message}`);
}

// Enviar al usuario
await this.userEmailAdapter.sendUserBookingCreated(booking, userEmail, lang, userData);

// Enviar al admin
await this.adminEmailAdapter.sendAdminBookingCreated(booking, userData);
```

## Flujo Correcto Ahora

1. **Creación de Booking**:
   - Se crea el booking en `booking.service.ts`
   - Se emite el evento `send-booking.created` con el `lang` correcto
   - Se envía UN SOLO email al cliente en el idioma especificado
   - Se envía UN SOLO email al admin con toda la información

2. **Creación de Contrato**:
   - Se crea el contrato en `contract.service.ts`
   - Ya NO se emite el evento `send-contract.created` para emails
   - Solo se registra un log informativo

3. **Sistema de Deduplicación**:
   - Si por alguna razón se intenta enviar un email duplicado dentro de 1 minuto
   - El sistema lo detecta y lo ignora automáticamente
   - Se registra un warning en los logs

## Archivos Modificados

1. `src/notification/infrastructure/nest/controllers/notification.events.controller.ts`
2. `src/contract/application/services/contract.service.ts`
3. `src/notification/application/services/notification.event.service.ts`

## Testing

Para verificar que el fix funciona correctamente:

1. **Crear una nueva reserva**:
   - Verificar que se recibe UN SOLO email en el idioma seleccionado
   - Verificar que el admin recibe UN SOLO email con toda la información

2. **Crear un contrato**:
   - Verificar que NO se envían emails adicionales
   - Verificar en los logs que aparece el mensaje: "Email ya enviado en booking.created"

3. **Intentar crear múltiples reservas rápidamente**:
   - Verificar que el sistema de deduplicación funciona
   - Verificar en los logs los mensajes de "Email duplicado detectado"

## Notas Adicionales

- El sistema de deduplicación es en memoria, por lo que se reinicia cuando se reinicia el servidor
- La ventana de deduplicación de 1 minuto es configurable mediante la constante `DEDUP_WINDOW_MS`
- Los logs son muy detallados para facilitar el debugging en caso de problemas
- El evento `send-contract.created` se mantiene para posibles usos futuros, pero ya no envía emails

## Problema del Campo "Customer/Vendor"

**Estado**: No se encontró este problema en el código actual. Las plantillas de email del admin (`admin-booking-content.template.ts`) muestran correctamente:
- Nombre completo del cliente
- Email del cliente
- Teléfono del cliente
- Hotel (si está disponible)

Si este problema persiste, por favor proporcionar más detalles sobre dónde aparece exactamente este campo.
