# Funcionalidad de Confirmación de Reservas

## Resumen
Se ha implementado la funcionalidad para confirmar reservas en el sistema. Esta funcionalidad permite identificar reservas mediante un flag `isReserve` y confirmarlas, cambiando su estado a "APROBADA" y actualizando el monto pagado.

## Cambios Realizados

### 1. Schema de Base de Datos
**Archivo**: `src/core/infrastructure/mongo/schemas/public/booking.schema.ts`

Se agregó el campo `isReserve` al schema de Booking:
```typescript
@Prop({ type: Boolean, default: false })
isReserve: boolean;
```

Este campo permite identificar si una reserva es una reserva pendiente de confirmación (true) o una reserva ya confirmada/booking normal (false).

### 2. Modelo de Dominio
**Archivo**: `src/booking/domain/models/booking.model.ts`

Se realizaron los siguientes cambios:

- Agregado el campo privado `_isReserve: boolean`
- Incluido `isReserve` en el método `toJSON()`
- Agregado `isReserve` en los métodos `create()` y `hydrate()` con valor por defecto `false`
- Creado el método `confirmReservation()`:
  ```typescript
  confirmReservation(): void {
    this._isReserve = false;
    this._totalPaid = this._total;
  }
  ```

### 3. Interfaz de Servicio
**Archivo**: `src/booking/domain/services/booking.interface.service.ts`

Se agregó el método:
```typescript
confirmReservation(
  id: string,
  email: string,
  lang?: string,
): Promise<BookingModel>;
```

### 4. Implementación del Servicio
**Archivo**: `src/booking/application/services/booking.service.ts`

Se implementó el método `confirmReservation()` que:
1. Verifica que la reserva exista
2. Valida que `isReserve` sea `true`
3. Obtiene el estado "APPROVED"
4. Actualiza el estado de la reserva a "APPROVED"
5. Llama a `booking.confirmReservation()` para actualizar `isReserve` a `false` y `totalPaid` al valor de `total`
6. Emite un evento `send-booking.confirmed` para notificaciones por email
7. Crea las comisiones correspondientes (si aplica)

### 5. Repositorio
**Archivo**: `src/booking/infrastructure/mongo/repositories/booking.repository.ts`

Se agregó soporte para filtrar por `isReserve`:
- Agregado el parámetro `isReserve` en el método `findAll()`
- Incluido `isReserve` en la query de filtrado
- Agregado `isReserve: 1` en la proyección del aggregate para que se retorne en la respuesta

### 6. Controlador
**Archivo**: `src/booking/infrastructure/nest/controllers/booking.controller.ts`

Se realizaron los siguientes cambios:

#### Nuevo Endpoint: Confirmar Reserva
```typescript
@Put('confirm/:id')
@HttpCode(200)
@UseGuards(AuthGuards)
async confirmReservation(
  @Param('id') id: string,
  @Query('lang') lang: string,
  @Req() req: IUserRequest,
)
```

**Ruta**: `PUT /booking/confirm/:id`
**Autenticación**: Requerida (todos los roles pueden confirmar)
**Parámetros**:
- `id` (path): ID de la reserva a confirmar
- `lang` (query, opcional): Idioma para notificaciones (default: 'es')

**Respuestas**:
- 200: Reserva confirmada exitosamente
- 404: Reserva no encontrada
- 400: La reserva no es una reserva (isReserve = false)

#### Filtro Agregado al Endpoint GET
Se agregó el query parameter `isReserve` al endpoint `GET /booking`:
```typescript
@ApiQuery({
  name: 'isReserve',
  required: false,
  type: 'boolean',
  description: 'Filter by reservation status',
})
```

## Uso

### Filtrar Reservas
Para obtener solo las reservas pendientes de confirmación:
```
GET /booking?isReserve=true
```

Para obtener solo las reservas confirmadas/bookings normales:
```
GET /booking?isReserve=false
```

### Confirmar una Reserva
```
PUT /booking/confirm/:bookingId?lang=es
```

**Proceso de Confirmación**:
1. Cambia el estado a "APPROVED"
2. Establece `isReserve` a `false`
3. Actualiza `totalPaid` al valor de `total`
4. Envía notificaciones por email
5. Crea las comisiones correspondientes

## Notas Importantes

1. **Valor por Defecto**: El campo `isReserve` tiene valor por defecto `false`, por lo que todas las reservas existentes y nuevas serán consideradas como confirmadas a menos que se especifique lo contrario.

2. **Validación**: El endpoint de confirmación valida que `isReserve` sea `true` antes de proceder. Si se intenta confirmar una reserva que ya está confirmada, retornará un error 400.

3. **Comisiones**: Al confirmar una reserva, se crean automáticamente las comisiones correspondientes, ya sea por concierge o por vehículo, siguiendo la misma lógica que en la validación de reservas.

4. **Eventos**: Se emite el evento `send-booking.confirmed` que puede ser escuchado por otros módulos para realizar acciones adicionales (como enviar emails de confirmación).

5. **Autenticación**: Todos los usuarios autenticados pueden confirmar reservas, no hay restricción por rol.

## Integración con Frontend

### Endpoints Disponibles

#### 1. Obtener Todas las Reservas (con filtro)
```
GET /booking?isReserve=true
```

**O también desde contratos:**
```
GET /contract?isReserve=true
```
**Parámetros Query**:
- `isReserve` (boolean, opcional): 
  - `true` = Solo reservas pendientes de confirmación
  - `false` = Solo reservas confirmadas/bookings normales
  - Sin especificar = Todas las reservas

**Otros filtros disponibles**:
- `status`: ID del estado
- `paymentMethod`: ID del método de pago
- `userId`: ID del usuario
- `startDate`: Fecha de inicio
- `endDate`: Fecha de fin
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 10)

**Respuesta**:
```json
{
  "data": [
    {
      "_id": "...",
      "bookingNumber": 7300,
      "total": 1000,
      "totalPaid": 500,
      "isReserve": true,
      "status": { "name": "PENDING", "_id": "..." },
      "paymentMethod": { "name": "Efectivo", "_id": "..." },
      "userContact": {
        "name": "Juan",
        "lastName": "Pérez",
        "email": "juan@example.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### 2. Obtener Reserva por ID
```
GET /booking/:id
```
**Respuesta**: Incluye el campo `isReserve`

#### 3. Obtener Reservas del Usuario Actual
```
GET /booking/user
```
**Respuesta**: Array de bookings con el campo `isReserve`

#### 4. Confirmar Reserva
```
PUT /booking/confirm/:id?lang=es
```
**Parámetros**:
- `id` (path, requerido): ID de la reserva
- `lang` (query, opcional): Idioma para emails (default: 'es')

**Headers requeridos**:
```
Authorization: Bearer {token}
```

**Respuesta exitosa (200)**:
```json
{
  "_id": "...",
  "bookingNumber": 7300,
  "total": 1000,
  "totalPaid": 1000,
  "isReserve": false,
  "status": { "name": "APPROVED", "_id": "..." },
  "paymentMethod": { "name": "Efectivo", "_id": "..." }
}
```

**Errores posibles**:
- 404: Reserva no encontrada
- 400: La reserva no es una reserva pendiente (isReserve = false)
- 401: No autenticado

### Implementación en Frontend

#### Ejemplo con React/JavaScript:

```javascript
// 1. Obtener reservas pendientes
const fetchPendingReservations = async () => {
  const response = await fetch('/booking?isReserve=true', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
};

// 2. Confirmar una reserva
const confirmReservation = async (bookingId) => {
  try {
    const response = await fetch(`/booking/confirm/${bookingId}?lang=es`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const confirmedBooking = await response.json();
    console.log('Reserva confirmada:', confirmedBooking);
    return confirmedBooking;
  } catch (error) {
    console.error('Error al confirmar reserva:', error);
    throw error;
  }
};

// 3. Componente de ejemplo
function ReservationsList() {
  const [reservations, setReservations] = useState([]);
  
  useEffect(() => {
    fetchPendingReservations().then(data => {
      setReservations(data.data);
    });
  }, []);
  
  const handleConfirm = async (bookingId) => {
    try {
      await confirmReservation(bookingId);
      // Recargar la lista
      const data = await fetchPendingReservations();
      setReservations(data.data);
      alert('Reserva confirmada exitosamente');
    } catch (error) {
      alert('Error al confirmar la reserva');
    }
  };
  
  return (
    <div>
      {reservations.map(booking => (
        <div key={booking._id}>
          <h3>Reserva #{booking.bookingNumber}</h3>
          <p>Total: ${booking.total}</p>
          <p>Pagado: ${booking.totalPaid}</p>
          <p>Estado: {booking.status.name}</p>
          
          {booking.isReserve && (
            <button onClick={() => handleConfirm(booking._id)}>
              Confirmar Reserva
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Flujo de Trabajo Recomendado

1. **Listar Reservas Pendientes**: 
   - Llamar a `GET /booking?isReserve=true` para mostrar solo reservas pendientes
   - Mostrar un badge o indicador visual para identificarlas

2. **Mostrar Botón de Confirmación**:
   - Solo mostrar el botón "Confirmar Reserva" cuando `isReserve === true`
   - Deshabilitar el botón si el estado no es apropiado

3. **Confirmar Reserva**:
   - Al hacer clic, llamar a `PUT /booking/confirm/:id`
   - Mostrar un loader mientras se procesa
   - Actualizar la UI después de la confirmación exitosa

4. **Manejo de Errores**:
   - Mostrar mensaje si la reserva ya fue confirmada
   - Validar permisos antes de mostrar el botón

### Campos Importantes

- **`isReserve`**: 
  - `true` = Reserva pendiente de confirmación
  - `false` = Reserva confirmada o booking normal

- **`totalPaid`**: 
  - En reservas pendientes puede ser menor que `total`
  - Después de confirmar, se iguala a `total`

- **`status.name`**: 
  - Después de confirmar cambia a "APPROVED"

El frontend debe:
1. Usar el filtro `isReserve=true` para mostrar solo las reservas pendientes de confirmación
2. Mostrar un botón "Confirmar Reserva" para cada reserva con `isReserve: true`
3. Al hacer clic, llamar al endpoint `PUT /booking/confirm/:id`
4. Actualizar la lista de reservas después de la confirmación exitosa
5. El campo `isReserve` está disponible en todos los endpoints GET de bookings
