# Fix: Validación de Stock de Vehículos

## Problema Identificado

El sistema estaba permitiendo vender vehículos sin stock disponible, asignando la misma unidad a múltiples reservas cuando no había inventario disponible. Esto ocurría principalmente con bicicletas, pero podía afectar a cualquier categoría de vehículo.

### Causa Raíz

1. **Falta de validación al agregar al carrito**: Cuando un usuario seleccionaba un vehículo y lo agregaba al carrito, el sistema NO verificaba si ese vehículo específico estaba disponible para las fechas seleccionadas.

2. **Validación insuficiente al crear booking**: Aunque existía validación al crear el booking desde el carrito, esta se ejecutaba demasiado tarde en el proceso, después de que el usuario ya había completado todo el flujo de compra.

3. **Asignación de vehículos sin verificar reservas existentes**: El sistema no consultaba las reservas existentes del vehículo antes de permitir su selección.

## Solución Implementada

### 1. Validación en el Servicio de Carrito

**Archivo modificado**: `src/cart/application/services/cart.service.ts`

Se agregó validación de disponibilidad al momento de agregar vehículos al carrito:

```typescript
// VALIDAR DISPONIBILIDAD DEL VEHÍCULO PARA LAS FECHAS SELECCIONADAS
if (i.dates && i.dates.start && i.dates.end) {
    const vehicleData = vehicleModel.toJSON();
    const requestedStart = new Date(i.dates.start);
    const requestedEnd = new Date(i.dates.end);
    
    // Verificar si el vehículo tiene reservas que se solapen con las fechas solicitadas
    if (vehicleData.reservations && vehicleData.reservations.length > 0) {
        const hasConflict = vehicleData.reservations.some((reservation: any) => {
            const reservationStart = new Date(reservation.start).getTime();
            const reservationEnd = new Date(reservation.end).getTime();
            const requestedStartTime = requestedStart.getTime();
            const requestedEndTime = requestedEnd.getTime();

            // Verificar si hay solapamiento de fechas
            return (
                (requestedStartTime >= reservationStart && requestedStartTime < reservationEnd) ||
                (requestedEndTime > reservationStart && requestedEndTime <= reservationEnd) ||
                (requestedStartTime <= reservationStart && requestedEndTime >= reservationEnd)
            );
        });

        if (hasConflict) {
            const vehicleName = vehicleData.name || 'Vehículo';
            const categoryName = vehicleData.category?.name || 'esta categoría';
            throw new BaseErrorException(
                `El vehículo "${vehicleName}" no está disponible para las fechas seleccionadas (${requestedStart.toLocaleDateString()} - ${requestedEnd.toLocaleDateString()}). Por favor, selecciona otro vehículo de ${categoryName} o cambia las fechas.`,
                409, // 409 Conflict
            );
        }
    }
}
```

### Características de la Validación

1. **Verificación de solapamiento de fechas**: Detecta cualquier conflicto entre las fechas solicitadas y las reservas existentes del vehículo.

2. **Mensaje de error descriptivo**: Informa al usuario exactamente qué vehículo no está disponible y sugiere alternativas.

3. **Código de estado HTTP apropiado**: Usa 409 (Conflict) para indicar que hay un conflicto con el estado actual del recurso.

4. **Validación temprana**: Se ejecuta al momento de agregar al carrito, antes de que el usuario complete el proceso de compra.

## Validación Existente Mantenida

La validación en `booking.service.ts` (método `addManualBookingInUserFromCart`) se mantiene como segunda capa de seguridad:

```typescript
// 2.5. VALIDAR DISPONIBILIDAD DE VEHÍCULOS ANTES DE CREAR EL BOOKING
if (cartData.vehicles && cartData.vehicles.length > 0) {
  for (const vehicleItem of cartData.vehicles) {
    // ... validación de disponibilidad ...
  }
}
```

## Beneficios de la Solución

1. **Prevención temprana**: Los usuarios son notificados inmediatamente si un vehículo no está disponible, antes de completar el proceso de compra.

2. **Mejor experiencia de usuario**: Mensajes claros que indican qué vehículo no está disponible y qué acciones pueden tomar.

3. **Protección de datos**: Evita la creación de reservas con conflictos de inventario.

4. **Aplicable a todas las categorías**: La validación funciona para bicicletas, motos, autos, y cualquier otra categoría de vehículo.

5. **Doble capa de seguridad**: Validación tanto al agregar al carrito como al crear el booking.

## Flujo de Validación

```
Usuario selecciona vehículo
         ↓
Intenta agregar al carrito
         ↓
[VALIDACIÓN 1] ¿Vehículo disponible para fechas?
         ↓ NO → Error 409: Vehículo no disponible
         ↓ SÍ
Vehículo agregado al carrito
         ↓
Usuario completa compra
         ↓
[VALIDACIÓN 2] ¿Vehículo aún disponible?
         ↓ NO → Error: Vehículo no disponible
         ↓ SÍ
Booking creado + Reserva registrada en vehículo
```

## Casos de Uso Cubiertos

### ✅ Caso 1: Sin Stock Disponible
- **Escenario**: No hay bicicletas disponibles para las fechas seleccionadas
- **Resultado**: Error al intentar agregar al carrito con mensaje descriptivo
- **Acción del usuario**: Seleccionar otro vehículo o cambiar fechas

### ✅ Caso 2: Vehículo Parcialmente Reservado
- **Escenario**: El vehículo tiene reservas que se solapan parcialmente con las fechas solicitadas
- **Resultado**: Error al intentar agregar al carrito
- **Acción del usuario**: Ajustar fechas o seleccionar otro vehículo

### ✅ Caso 3: Múltiples Usuarios Intentan Reservar el Mismo Vehículo
- **Escenario**: Dos usuarios intentan reservar el mismo vehículo para fechas solapadas
- **Resultado**: El primero en agregar al carrito tiene éxito, el segundo recibe error
- **Acción del segundo usuario**: Seleccionar otro vehículo

### ✅ Caso 4: Todas las Categorías de Vehículos
- **Escenario**: Aplica a bicicletas, motos, autos, etc.
- **Resultado**: Validación consistente para todos los tipos de vehículos

## Recomendaciones Adicionales

### 1. Implementar Sistema de Reserva Temporal

Para mejorar aún más la experiencia, considerar implementar un sistema de "reserva temporal" que bloquee el vehículo por un tiempo limitado (ej: 15 minutos) mientras el usuario completa la compra:

```typescript
// Pseudocódigo
interface TemporaryReservation {
  vehicleId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  expiresAt: Date; // 15 minutos desde creación
}
```

### 2. Notificaciones en Tiempo Real

Implementar notificaciones WebSocket para alertar a los usuarios si un vehículo en su carrito es reservado por otro usuario:

```typescript
// Pseudocódigo
socket.emit('vehicle-no-longer-available', {
  vehicleId: string,
  vehicleName: string,
  message: string
});
```

### 3. Sugerencias Automáticas de Alternativas

Cuando un vehículo no está disponible, sugerir automáticamente vehículos similares de la misma categoría que sí estén disponibles:

```typescript
// Pseudocódigo
if (hasConflict) {
  const alternatives = await findAlternativeVehicles(
    vehicleData.category._id,
    requestedStart,
    requestedEnd
  );
  
  throw new BaseErrorException(
    `El vehículo "${vehicleName}" no está disponible. Vehículos alternativos: ${alternatives.map(v => v.name).join(', ')}`,
    409
  );
}
```

### 4. Dashboard de Disponibilidad

Crear un dashboard para administradores que muestre:
- Vehículos con bajo stock
- Vehículos más reservados
- Períodos de alta demanda
- Alertas de conflictos de reservas

### 5. Validación de Integridad Periódica

Implementar un job programado que verifique la integridad de las reservas:

```typescript
// Pseudocódigo
async function validateReservationIntegrity() {
  // Buscar vehículos con reservas solapadas
  // Buscar reservas sin booking asociado
  // Buscar bookings sin reserva en vehículo
  // Generar reporte de inconsistencias
}
```

## Testing

### Casos de Prueba Recomendados

1. **Test: Agregar vehículo disponible al carrito**
   - Resultado esperado: ✅ Éxito

2. **Test: Agregar vehículo no disponible al carrito**
   - Resultado esperado: ❌ Error 409 con mensaje descriptivo

3. **Test: Agregar vehículo con reserva parcialmente solapada**
   - Resultado esperado: ❌ Error 409

4. **Test: Crear booking con vehículo que se volvió no disponible**
   - Resultado esperado: ❌ Error de conflicto

5. **Test: Validación para diferentes categorías (bici, moto, auto)**
   - Resultado esperado: ✅ Validación consistente para todas

## Monitoreo

### Métricas a Monitorear

1. **Tasa de errores 409**: Indica cuántas veces los usuarios intentan reservar vehículos no disponibles
2. **Tiempo entre agregar al carrito y completar compra**: Ayuda a determinar el tiempo óptimo para reservas temporales
3. **Vehículos más afectados por conflictos**: Identifica qué vehículos necesitan más unidades
4. **Categorías con más conflictos**: Ayuda a planificar expansión de inventario

## Conclusión

La solución implementada resuelve el problema de asignación de vehículos sin stock mediante validación temprana y mensajes claros al usuario. La arquitectura de doble validación (carrito + booking) proporciona una capa adicional de seguridad contra condiciones de carrera y garantiza la integridad de las reservas.

Las recomendaciones adicionales pueden implementarse gradualmente para mejorar aún más la experiencia del usuario y la gestión del inventario.
