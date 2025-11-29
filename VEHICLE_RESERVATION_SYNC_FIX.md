# Fix: Sincronización de Reservas de Vehículos al Editar Booking

## 🔍 Problema Identificado

Cuando se edita un booking desde el dashboard (edición completa de vehículo), el sistema actualiza correctamente:
- ✅ El campo `cart` del booking
- ✅ El `activeCartVersion`
- ✅ El `contract_history` (snapshot)

Pero **NO actualiza**:
- ❌ El array `reservations` del vehículo

Esto causa que las fechas antiguas permanezcan bloqueadas en el vehículo, generando solapamientos con nuevas reservas.

## 📍 Ubicación del Código

**Archivo:** `src/contract/infrastructure/mongo/repositories/contract.repository.ts`

**Función afectada:** `updateVehicleReservations` (línea ~1100)

## 🛠️ Solución Implementada

La función `updateVehicleReservations` actualmente solo actualiza la fecha de fin (`end`) cuando hay una extensión. Necesitamos agregar lógica para actualizar **ambas fechas** (inicio y fin) cuando se edita completamente un vehículo.

### Cambios Necesarios

Reemplazar la sección de actualización de fechas en la función `updateVehicleReservations`:

```typescript
// 2. Actualizar fechas de vehículos que siguen en uso pero con fechas diferentes
for (const newVehicleItem of newCart.vehicles || []) {
  const vehicleId =
    typeof newVehicleItem.vehicle === 'string'
      ? newVehicleItem.vehicle
      : newVehicleItem.vehicle._id.toString();
  const oldVehicleItem = oldVehiclesMap.get(vehicleId);

  if (oldVehicleItem) {
    // Verificar si cambió la fecha de inicio O la fecha de fin
    const startChanged = newVehicleItem.dates.start.toString() !== oldVehicleItem.dates.start.toString();
    const endChanged = newVehicleItem.dates.end.toString() !== oldVehicleItem.dates.end.toString();
    
    if (startChanged || endChanged) {
      const originalStartDate = new Date(oldVehicleItem.dates.start);
      const originalEndDate = new Date(oldVehicleItem.dates.end);
      const newStartDate = new Date(newVehicleItem.dates.start);
      const newEndDate = new Date(newVehicleItem.dates.end);

      const vehicle = await this.vehicleModel
        .findById(vehicleId)
        .session(session);
      if (!vehicle || !vehicle.reservations) continue;

      const reservationsTyped = vehicle.reservations as ReservationWithId[];

      // Buscar la reserva que coincide con las fechas originales
      const reservationIndex = reservationsTyped.findIndex((reservation) => {
        // Si tenemos bookingId, usarlo como identificador principal
        if (bookingId && (reservation as any).bookingId) {
          return (reservation as any).bookingId === bookingId;
        }

        // Fallback: usar fechas con tolerancia
        const reservationStartTime = new Date(reservation.start).getTime();
        const reservationEndTime = new Date(reservation.end).getTime();
        const originalStartTime = originalStartDate.getTime();
        const originalEndTime = originalEndDate.getTime();
        
        // Tolerancia de 1 minuto para diferencias de fecha
        const startDiff = Math.abs(reservationStartTime - originalStartTime);
        const endDiff = Math.abs(reservationEndTime - originalEndTime);
        
        return startDiff <= 60000 && endDiff <= 60000;
      });

      if (reservationIndex === -1) {
        console.warn(
          `No se encontró reserva coincidente para el vehículo ${vehicleId}${bookingId ? ` (booking: ${bookingId})` : ''} con fechas ${originalStartDate} - ${originalEndDate}`,
        );
        continue;
      }

      const reservationToUpdateId = reservationsTyped[reservationIndex]._id;

      // Preparar el objeto de actualización
      const updateFields: any = {};
      if (startChanged) {
        updateFields['reservations.$.start'] = newStartDate;
      }
      if (endChanged) {
        updateFields['reservations.$.end'] = newEndDate;
      }

      // Actualizar la reserva con las nuevas fechas
      await this.vehicleModel.updateOne(
        { _id: vehicleId, 'reservations._id': reservationToUpdateId },
        { $set: updateFields },
        { session },
      );

      console.log(
        `Reserva actualizada para vehículo ${vehicleId}${bookingId ? ` (booking: ${bookingId})` : ''}:`,
        {
          oldStart: startChanged ? originalStartDate : 'sin cambios',
          newStart: startChanged ? newStartDate : 'sin cambios',
          oldEnd: endChanged ? originalEndDate : 'sin cambios',
          newEnd: endChanged ? newEndDate : 'sin cambios',
        }
      );
    }
  }
}
```

## 🔑 Mejoras Clave

1. **Detección de cambios en ambas fechas**: Ahora verifica si cambió `start` O `end`
2. **Actualización selectiva**: Solo actualiza los campos que realmente cambiaron
3. **Mejor identificación de reservas**: Usa `bookingId` como identificador principal cuando está disponible
4. **Logging mejorado**: Muestra qué fechas cambiaron exactamente
5. **Tolerancia de tiempo**: Mantiene 1 minuto de tolerancia para comparación de fechas

## 📝 Validación

Para validar que el fix funciona correctamente:

1. **Crear un booking** con un vehículo en fechas específicas
2. **Verificar** que se crea la reserva en el vehículo:
   ```javascript
   db.vehicle.findOne({ _id: ObjectId('VEHICLE_ID') }, { reservations: 1 })
   ```

3. **Editar el booking** desde el dashboard cambiando las fechas
4. **Verificar** que la reserva se actualizó correctamente:
   ```javascript
   db.vehicle.findOne({ _id: ObjectId('VEHICLE_ID') }, { reservations: 1 })
   ```

5. **Confirmar** que no hay reservas duplicadas o huérfanas

## 🎯 Casos de Uso Cubiertos

- ✅ Edición de fecha de inicio solamente
- ✅ Edición de fecha de fin solamente (extensión)
- ✅ Edición de ambas fechas (edición completa)
- ✅ Cambio de vehículo (libera el antiguo, reserva el nuevo)
- ✅ Cancelación de booking (libera todas las reservas)

## ⚠️ Consideraciones Adicionales

### Validación de Disponibilidad

Cuando se editan las fechas, el sistema debería validar que el vehículo esté disponible en las nuevas fechas **antes** de actualizar la reserva. Esto se puede agregar en el endpoint de edición del booking.

### Transacciones

La función ya opera dentro de una transacción de MongoDB (`session`), lo que garantiza que si algo falla, todos los cambios se revierten automáticamente.

### Concurrencia

Si dos admins intentan editar el mismo booking simultáneamente, MongoDB manejará la concurrencia a nivel de documento. Sin embargo, se recomienda implementar un sistema de "locks" o versioning optimista en el frontend para evitar conflictos.

## 🚀 Próximos Pasos

1. **Aplicar el fix** en el archivo `contract.repository.ts`
2. **Probar** con diferentes escenarios de edición
3. **Monitorear** los logs para confirmar que las actualizaciones se realizan correctamente
4. **Considerar** agregar validación de disponibilidad antes de actualizar
5. **Documentar** el comportamiento esperado para el equipo

## 📚 Referencias

- **Archivo modificado**: `src/contract/infrastructure/mongo/repositories/contract.repository.ts`
- **Función**: `updateVehicleReservations` (línea ~1100)
- **Relacionado con**: Sistema de reservas de vehículos, edición de bookings desde dashboard
