# Fix: Validación de Disponibilidad de Vehículos

## Problema Identificado

El sistema permitía asignar un vehículo ya rentado a una nueva reserva porque:

1. **No validaba la disponibilidad** del vehículo antes de crear el booking
2. **No creaba la reserva** en el array `reservations` del vehículo al momento de crear el booking

### Ejemplo del Problema

- **Reserva #7683**: Vehículo S-46 del 03/12/2025 al 21/12/2025
- **Reserva #7741**: Vehículo S-46 del 14/12/2025 al 17/12/2025 ❌ (fechas solapadas)

La reserva #7741 se creó exitosamente a pesar de que el vehículo S-46 ya estaba rentado en esas fechas.

## Solución Implementada

### 1. Validación de Disponibilidad

Se agregó validación en `booking.service.ts` en el método `addManualBookingInUserFromCart`:

```typescript
// 2.5. VALIDAR DISPONIBILIDAD DE VEHÍCULOS ANTES DE CREAR EL BOOKING
if (cartData.vehicles && cartData.vehicles.length > 0) {
  for (const vehicleItem of cartData.vehicles) {
    const vehicleId = vehicleItem.vehicle?._id || vehicleItem.vehicle;
    const startDate = new Date(vehicleItem.dates.start);
    const endDate = new Date(vehicleItem.dates.end);

    // Verificar disponibilidad del vehículo
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new BaseErrorException(
        `Vehicle ${vehicleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const vehicleData = vehicle.toJSON();
    
    // Verificar si el vehículo tiene reservas que se solapen con las fechas solicitadas
    if (vehicleData.reservations && vehicleData.reservations.length > 0) {
      const hasConflict = vehicleData.reservations.some((reservation: any) => {
        const reservationStart = new Date(reservation.start).getTime();
        const reservationEnd = new Date(reservation.end).getTime();
        const requestedStart = startDate.getTime();
        const requestedEnd = endDate.getTime();

        // Verificar si hay solapamiento de fechas
        return (
          (requestedStart >= reservationStart && requestedStart < reservationEnd) ||
          (requestedEnd > reservationStart && requestedEnd <= reservationEnd) ||
          (requestedStart <= reservationStart && requestedEnd >= reservationEnd)
        );
      });

      if (hasConflict) {
        const vehicleName = vehicleData.name || vehicleId;
        throw new BaseErrorException(
          `El vehículo ${vehicleName} no está disponible en las fechas seleccionadas (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
          HttpStatus.CONFLICT,
        );
      }
    }
  }
}
```

### 2. Creación de Reservas en el Vehículo

Se agregó la creación de reservas en el array `reservations` del vehículo después de crear el booking:

```typescript
// 8.5. CREAR RESERVAS EN LOS VEHÍCULOS
if (cartData.vehicles && cartData.vehicles.length > 0) {
  const bookingId = bookingSave.toJSON()._id?.toString();
  
  for (const vehicleItem of cartData.vehicles) {
    try {
      const vehicleId = vehicleItem.vehicle?._id || vehicleItem.vehicle;
      const startDate = new Date(vehicleItem.dates.start);
      const endDate = new Date(vehicleItem.dates.end);

      // Obtener el vehículo
      const vehicle = await this.vehicleRepository.findById(vehicleId);
      if (!vehicle) {
        console.error(`[BookingService] Vehicle ${vehicleId} not found when creating reservation`);
        continue;
      }

      // Agregar la reserva al vehículo
      const vehicleData = vehicle.toJSON();
      const updatedReservations = [
        ...(vehicleData.reservations || []),
        {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          bookingId: bookingId,
          reservationId: bookingId,
        }
      ];

      // Actualizar el vehículo con la nueva reserva
      vehicle.setReservations(
        updatedReservations.map(res => ReservationModel.create(res))
      );

      await this.vehicleRepository.update(vehicleId, vehicle);

      console.log(`[BookingService] Reserva creada para vehículo ${vehicleId} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);
    } catch (error) {
      console.error(`[BookingService] Error creating reservation for vehicle:`, error);
      // No fallar la creación del booking si falla la creación de la reserva
    }
  }
}
```

## Lógica de Detección de Solapamiento

La validación detecta solapamiento de fechas en tres casos:

1. **Inicio dentro de una reserva existente**: La fecha de inicio solicitada cae dentro de una reserva existente
2. **Fin dentro de una reserva existente**: La fecha de fin solicitada cae dentro de una reserva existente
3. **Reserva que engloba otra**: La reserva solicitada engloba completamente una reserva existente

```typescript
// Verificar si hay solapamiento de fechas
return (
  (requestedStart >= reservationStart && requestedStart < reservationEnd) ||
  (requestedEnd > reservationStart && requestedEnd <= reservationEnd) ||
  (requestedStart <= reservationStart && requestedEnd >= reservationEnd)
);
```

## Comportamiento Esperado

### Antes del Fix

- ✅ Se podía crear una reserva con un vehículo ya rentado
- ❌ No se validaba la disponibilidad
- ❌ No se creaba la reserva en el vehículo

### Después del Fix

- ✅ Se valida la disponibilidad antes de crear la reserva
- ✅ Se rechaza la creación si hay conflicto de fechas
- ✅ Se crea la reserva en el array `reservations` del vehículo
- ✅ Se muestra un mensaje de error claro al usuario

## Mensajes de Error y Notificaciones

### Backend (API)

Si se intenta crear una reserva con un vehículo no disponible, el sistema responde con:

```
HTTP 409 CONFLICT
{
  "message": "El vehículo [Nombre del Vehículo] no está disponible en las fechas seleccionadas (DD/MM/YYYY - DD/MM/YYYY)"
}
```

### Frontend (Dashboard)

El dashboard captura el error 409 y muestra una notificación toast con:
- **Título**: El mensaje de error del backend
- **Descripción**: "Por favor, verifica la disponibilidad del vehículo y selecciona otras fechas."
- **Duración**: 6 segundos (más tiempo para que el usuario pueda leer el mensaje completo)

```typescript
if (statusCode === 409) {
  toast.error(
    Array.isArray(err) ? err.join(', ') : err,
    {
      duration: 6000,
      description: 'Por favor, verifica la disponibilidad del vehículo y selecciona otras fechas.'
    }
  )
}
```

### Frontend (Web - Carrito)

En la web pública, cuando un usuario intenta proceder con el checkout y hay un vehículo no disponible:
- Se muestra una notificación toast con el mensaje de error
- El usuario es redirigido de vuelta al carrito
- Se sugiere seleccionar otras fechas o vehículos

**Nota**: Las notificaciones están traducidas automáticamente según el idioma del usuario (español/inglés).

## Archivos Modificados

- `back-movingRentals/src/booking/application/services/booking.service.ts`

## Testing

Para probar el fix:

1. Crear una reserva con un vehículo en fechas específicas
2. Intentar crear otra reserva con el mismo vehículo en fechas que se solapen
3. Verificar que el sistema rechace la segunda reserva con un error 409
4. Verificar que el array `reservations` del vehículo contenga la primera reserva

## Notas Adicionales

- La validación se aplica **solo en el método `addManualBookingInUserFromCart`** que es el usado desde el dashboard
- Si falla la creación de la reserva en el vehículo, **no se falla la creación del booking** (se registra el error en logs)
- El `bookingId` se usa como identificador en la reserva para facilitar la liberación posterior
- La liberación de reservas al cancelar un booking ya estaba implementada y sigue funcionando correctamente
