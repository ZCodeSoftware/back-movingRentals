# Guía Simple: Manejo de Fechas - Zona Horaria México

## Contexto

✅ **Frontend**: Ya envía TODAS las fechas en zona horaria de México (America/Cancun, GMT-5)
- Ejemplo: `2025-12-01T09:00:00.000-05:00`

✅ **Backend**: Debe guardar las fechas **EXACTAMENTE como vienen**, sin conversiones

## Regla de Oro

> **NO CONVERTIR FECHAS** - Guardar tal cual vienen del frontend

## Lo que SÍ necesitas hacer

### 1. Configurar Zona Horaria del Servidor

Agregar al archivo `.env`:

```env
# Zona Horaria de México (Tulum/Cancún)
TZ=America/Cancun
```

### 2. Configurar en main.ts

Agregar al inicio de `src/main.ts`:

```typescript
async function bootstrap() {
  // Configurar zona horaria de México
  process.env.TZ = 'America/Cancun';
  
  console.log('🌎 Zona horaria:', process.env.TZ);
  console.log('🕐 Hora del servidor:', new Date().toLocaleString('es-MX', { 
    timeZone: 'America/Cancun' 
  }));

  const app = await NestFactory.create(AppModule);
  // ... resto del código
}
```

### 3. Al Recibir Fechas del Frontend

**NO HACER ESTO** ❌:
```typescript
// ❌ NO convertir
const date = new Date(frontendDate);
const mexicoDate = date.toLocaleString('en-US', { timeZone: 'America/Cancun' });

// ❌ NO ajustar
const date = new Date(frontendDate);
date.setHours(date.getHours() - 5);
```

**HACER ESTO** ✅:
```typescript
// ✅ Guardar directamente
const booking = {
  startDate: body.startDate,  // Tal cual viene del frontend
  endDate: body.endDate,      // Tal cual viene del frontend
  // ...
};

await this.bookingRepository.create(booking);
```

### 4. Al Leer Fechas de MongoDB

MongoDB guarda las fechas en UTC automáticamente, pero cuando las lees, ya vienen correctas:

```typescript
// ✅ Leer y devolver tal cual
const booking = await this.bookingRepository.findById(id);
return booking; // Las fechas ya están correctas
```

## Ejemplos Prácticos

### Ejemplo 1: Crear Reserva

```typescript
// Frontend envía:
{
  "startDate": "2025-12-01T09:00:00.000-05:00",
  "endDate": "2025-12-01T12:00:00.000-05:00"
}

// Backend recibe y guarda:
@Post()
async create(@Body() body: CreateBookingDTO) {
  const booking = {
    startDate: body.startDate,  // ✅ Sin conversión
    endDate: body.endDate,      // ✅ Sin conversión
    // ...
  };
  
  return await this.bookingService.create(booking);
}

// MongoDB guarda (automáticamente en UTC):
{
  "startDate": ISODate("2025-12-01T14:00:00.000Z"),  // UTC
  "endDate": ISODate("2025-12-01T17:00:00.000Z")     // UTC
}

// Al leer, MongoDB devuelve:
{
  "startDate": "2025-12-01T09:00:00.000-05:00",  // ✅ Correcto
  "endDate": "2025-12-01T12:00:00.000-05:00"     // ✅ Correcto
}
```

### Ejemplo 2: Filtrar por Fecha

Si necesitas filtrar por fecha, usa las fechas tal cual:

```typescript
// Frontend envía:
{
  "startDate": "2025-12-01",
  "endDate": "2025-12-31"
}

// Backend filtra:
async findAll(filters: any) {
  const query: any = {};
  
  if (filters.startDate) {
    // ✅ Usar directamente
    query.createdAt = { $gte: new Date(filters.startDate) };
  }
  
  if (filters.endDate) {
    // ✅ Agregar fin del día si es necesario
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    query.createdAt = { ...query.createdAt, $lte: endDate };
  }
  
  return await this.bookingRepository.findAll(query);
}
```

### Ejemplo 3: Crear Fecha Actual

Si necesitas crear una fecha con la hora actual del servidor:

```typescript
// ✅ Usar new Date() directamente
const booking = {
  createdAt: new Date(),  // Automáticamente en zona horaria del servidor (México)
  // ...
};
```

## Lo que NO necesitas hacer

❌ **NO crear utilidades de conversión** - No son necesarias
❌ **NO convertir fechas manualmente** - MongoDB lo hace automáticamente
❌ **NO usar `toLocaleString()` para conversiones** - Solo para mostrar
❌ **NO ajustar offsets manualmente** - El frontend ya lo hace

## Verificación

### 1. Verificar que el servidor usa la zona horaria correcta

```typescript
// En cualquier servicio, agregar log temporal:
console.log('🌎 TZ:', process.env.TZ);
console.log('🕐 Hora actual:', new Date().toISOString());
console.log('🇲🇽 Hora México:', new Date().toLocaleString('es-MX', { 
  timeZone: 'America/Cancun' 
}));
```

### 2. Verificar que las fechas se guardan correctamente

```typescript
// Al crear una reserva, agregar log:
console.log('📅 Fecha recibida del frontend:', body.startDate);
console.log('💾 Fecha a guardar:', body.startDate);
// Deben ser IGUALES
```

### 3. Verificar en MongoDB Compass

```javascript
// Buscar una reserva
db.bookings.findOne({ bookingNumber: 7673 });

// Las fechas se ven en UTC:
{
  "startDate": ISODate("2025-12-01T14:00:00.000Z")  // UTC
}

// Pero al leerlas desde el backend, se convierten automáticamente:
// "2025-12-01T09:00:00.000-05:00" (México)
```

## Resumen

### ✅ Lo que hace el Frontend
- Envía todas las fechas en zona horaria de México
- Formato: `YYYY-MM-DDTHH:mm:ss.sss-05:00`

### ✅ Lo que hace el Backend
1. Configurar `TZ=America/Cancun` en `.env` y `main.ts`
2. Recibir fechas del frontend **sin modificarlas**
3. Guardar en MongoDB **tal cual**
4. MongoDB convierte automáticamente a UTC para almacenamiento
5. Al leer, MongoDB devuelve las fechas correctamente

### ✅ Resultado
- Usuario en USA selecciona 9:00 AM → Se guarda como 9:00 AM México ✅
- Usuario en México selecciona 9:00 AM → Se guarda como 9:00 AM México ✅
- Usuario en Europa selecciona 9:00 AM → Se guarda como 9:00 AM México ✅

## Código Mínimo Necesario

### 1. Actualizar `.env`

```env
TZ=America/Cancun
```

### 2. Actualizar `src/main.ts`

```typescript
async function bootstrap() {
  // Configurar zona horaria
  process.env.TZ = 'America/Cancun';
  
  const app = await NestFactory.create(AppModule);
  // ... resto del código
}
```

### 3. En los servicios

```typescript
// ✅ CORRECTO - No hacer nada especial
async create(data: any) {
  return await this.repository.create({
    startDate: data.startDate,  // Tal cual
    endDate: data.endDate,      // Tal cual
    // ...
  });
}
```

## Casos Especiales

### Si necesitas la fecha actual del servidor

```typescript
// ✅ Usar new Date() directamente
const now = new Date();  // Ya está en zona horaria de México
```

### Si necesitas comparar fechas

```typescript
// ✅ Comparar directamente
const start = new Date(booking.startDate);
const end = new Date(booking.endDate);

if (start < end) {
  // ...
}
```

### Si necesitas formatear para mostrar

```typescript
// ✅ Usar toLocaleString solo para mostrar
const formatted = new Date(booking.startDate).toLocaleString('es-MX', {
  timeZone: 'America/Cancun'
});
```

## Conclusión

**El backend NO necesita hacer conversiones de zona horaria** porque:
1. El frontend ya envía las fechas en zona horaria de México
2. MongoDB maneja automáticamente la conversión UTC ↔ Zona Local
3. Solo necesitas configurar `TZ=America/Cancun` en el servidor

**Regla simple**: Recibe, guarda y devuelve las fechas tal cual. MongoDB hace el resto.
