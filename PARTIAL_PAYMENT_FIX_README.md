# Fix: Pagos Parciales en Efectivo

## Problema Identificado

Cuando un cliente pagaba el 20% en efectivo (por ejemplo, 558.60 MXN de un total de 2793.00 MXN), el sistema registraba que había pagado el 100% del monto total, marcando la reserva como completamente pagada cuando debería tener un saldo pendiente.

### Ejemplo del Problema
- **Total de la reserva**: 2793.00 MXN
- **Pago realizado (20%)**: 558.60 MXN
- **Saldo esperado**: 2234.40 MXN
- **Problema**: El sistema registraba `totalPaid = 2793.00 MXN` (100%)

## Causa Raíz

El método `payBooking()` en el modelo `BookingModel` solo aceptaba un parámetro booleano `paid`:

```typescript
payBooking(paid: boolean): void {
  if (paid) {
    this._totalPaid = this._total; // ❌ Siempre establecía el total completo
  }
}
```

Cuando se validaba un pago parcial con `paid=true`, el sistema automáticamente establecía `totalPaid` igual al `total`, sin considerar que podría ser un pago parcial.

## Solución Implementada

### 1. Modificación del Modelo BookingModel

Se actualizó el método `payBooking()` para aceptar un monto opcional:

```typescript
payBooking(paid: boolean, amount?: number): void {
  if (paid) {
    // Si se proporciona un monto específico, usarlo; si no, usar el total
    this._totalPaid = amount !== undefined ? amount : this._total;
  }
}
```

**Archivo**: `src/booking/domain/models/booking.model.ts`

### 2. Actualización del Servicio BookingService

Se modificó el método `validateBooking()` para:
- Aceptar un parámetro opcional `paidAmount`
- Pasar este monto al método `payBooking()`

```typescript
async validateBooking(
  id: string,
  paid: boolean,
  email: string,
  lang: string = 'es',
  isManual: boolean = false,
  isValidated: boolean = false,
  paidAmount?: number, // ✅ Nuevo parámetro
): Promise<BookingModel> {
  // ... código existente ...
  
  // Si se proporciona un monto pagado, usarlo; si no, usar el comportamiento por defecto
  booking.payBooking(paid, paidAmount);
  
  // ... resto del código ...
}
```

**Archivo**: `src/booking/application/services/booking.service.ts`

### 3. Actualización del Controlador BookingController

Se agregó el parámetro `paidAmount` como query parameter:

```typescript
@Put('validate/:id')
@ApiQuery({
  name: 'paidAmount',
  required: false,
  type: 'number',
  description: 'Amount paid (for partial payments)',
})
async validateBooking(
  @Param('id') id: string,
  @Query('paid') paid: boolean,
  @Query('paidAmount') paidAmount?: number, // ✅ Nuevo parámetro
  @Body() body?: any,
) {
  // Priorizar paidAmount del query param, luego del body
  const finalPaidAmount = paidAmount !== undefined ? paidAmount : body?.paidAmount;
  
  return await this.bookingService.validateBooking(
    id,
    paid,
    email,
    language,
    isManual,
    isValidated,
    finalPaidAmount, // ✅ Pasar el monto al servicio
  );
}
```

**Archivo**: `src/booking/infrastructure/nest/controllers/booking.controller.ts`

### 4. Actualización de la Interfaz

Se actualizó la interfaz `IBookingService` para reflejar el nuevo parámetro:

```typescript
validateBooking(
  id: string,
  paid: boolean,
  email: string,
  lang: string,
  isManual?: boolean,
  isValidated?: boolean,
  paidAmount?: number, // ✅ Actualizado
): Promise<BookingModel>;
```

**Archivo**: `src/booking/domain/services/booking.interface.service.ts`

## Uso

### Para Pagos Completos (100%)

```http
PUT /booking/validate/:id?paid=true
```

El sistema establecerá `totalPaid = total` automáticamente.

### Para Pagos Parciales

```http
PUT /booking/validate/:id?paid=true&paidAmount=558.60
```

El sistema establecerá `totalPaid = 558.60` (el monto especificado).

### Desde el Frontend

```typescript
// Pago parcial del 20%
const response = await fetch(`/booking/validate/${bookingId}?paid=true&paidAmount=${partialAmount}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// O enviando en el body
const response = await fetch(`/booking/validate/${bookingId}?paid=true`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paidAmount: partialAmount
  })
});
```

## Compatibilidad

✅ **Retrocompatible**: Si no se proporciona `paidAmount`, el sistema mantiene el comportamiento anterior (establece `totalPaid = total`).

## Casos de Uso

### 1. Pago del 20% en Efectivo (Anticipo)
```http
PUT /booking/validate/7673?paid=true&paidAmount=558.60
```
- Total: 2793.00 MXN
- Total Pagado: 558.60 MXN
- Saldo Pendiente: 2234.40 MXN

### 2. Pago Completo en Efectivo
```http
PUT /booking/validate/7673?paid=true
```
- Total: 2793.00 MXN
- Total Pagado: 2793.00 MXN
- Saldo Pendiente: 0.00 MXN

### 3. Pago Parcial con Stripe
Cuando se procesa un pago parcial con Stripe, el webhook puede incluir el monto pagado:
```typescript
// En el webhook de Stripe
const amountPaid = session.amount_total / 100; // Convertir de centavos a pesos
await bookingService.validateBooking(
  bookingId,
  true,
  email,
  'es',
  false,
  false,
  amountPaid
);
```

## Validación

Para verificar que el fix funciona correctamente:

1. Crear una reserva con total de 2793.00 MXN
2. Validar el pago con el 20%:
   ```http
   PUT /booking/validate/:id?paid=true&paidAmount=558.60
   ```
3. Verificar en la base de datos:
   ```javascript
   {
     total: 2793.00,
     totalPaid: 558.60,
     status: "APPROVED"
   }
   ```
4. El saldo pendiente se calcula como: `total - totalPaid = 2234.40 MXN`

## Notas Importantes

- El parámetro `paidAmount` es **opcional**
- Si no se proporciona, el sistema usa el comportamiento por defecto (pago completo)
- El monto debe ser en la misma moneda que el total de la reserva
- El sistema no valida que `paidAmount <= total` (esto debe manejarse en el frontend o agregarse como validación adicional)

## Archivos Modificados

1. `src/booking/domain/models/booking.model.ts`
2. `src/booking/application/services/booking.service.ts`
3. `src/booking/infrastructure/nest/controllers/booking.controller.ts`
4. `src/booking/domain/services/booking.interface.service.ts`

## Fecha de Implementación

29 de noviembre de 2025
