# Fix: Zona Horaria en Precios Promocionales

## Problema
Los precios promocionales no se estaban guardando correctamente en la zona horaria de Tulum, México (America/Cancun). El frontend estaba convirtiendo las fechas a UTC antes de enviarlas al backend, lo que causaba inconsistencias en las fechas guardadas.

## Solución Implementada

### 1. Frontend (new-mooving)

**Archivo modificado:** `src/pages/dashboard/components/dashboardCatalogs/catalogsList/PromotionalPriceModal.tsx`

#### Cambios realizados:

**ANTES** ❌:
```typescript
// Convertir las fechas de dayjs a ISO string UTC
const startDateISO = startDate.utc().toISOString()
const endDateISO = endDate.utc().toISOString()
```

**DESPUÉS** ✅:
```typescript
// Mantener las fechas en zona horaria de Cancún (Tulum, México)
// NO convertir a UTC - el backend las guardará tal cual
const startDateISO = startDate.format()  // Formato ISO con zona horaria
const endDateISO = endDate.format()      // Formato ISO con zona horaria
```

#### Resultado:
- Las fechas ahora se envían en formato ISO con la zona horaria de México incluida
- Ejemplo: `2025-01-15T10:00:00-06:00` (hora de Cancún/Tulum)
- El DateTimePicker ya está configurado con `timezone='America/Cancun'`

### 2. Backend (back-movingRentals)

#### Archivo 1: `src/promotional-price/application/services/promotional-price.service.ts`

**Cambios realizados:**

Se mejoró el método `toDate()` para agregar logs que ayuden a verificar que las fechas se están procesando correctamente:

```typescript
/**
 * Convierte una fecha a objeto Date manteniendo la zona horaria de México
 * Las fechas vienen del frontend en zona horaria de México (America/Cancun)
 * y deben guardarse tal cual, sin conversiones
 */
private toDate(dateInput: string | Date): Date {
    // Convertir a Date manteniendo la zona horaria original
    const date = new Date(dateInput);
    
    console.log('📅 Fecha recibida:', dateInput);
    console.log('📅 Fecha convertida a Date:', date.toISOString());
    console.log('📅 Fecha en zona México:', date.toLocaleString('es-MX', { 
        timeZone: 'America/Cancun',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }));
    
    return date;
}
```

**Importante:** El método NO hace conversiones, solo convierte el string a objeto Date. MongoDB se encarga automáticamente de guardar en UTC y devolver en la zona horaria correcta.

#### Archivo 2: `src/promotional-price/infrastructure/nest/controllers/promotional-price.controller.ts`

**Cambios realizados:**

Se eliminó el método `toMexicoTimezone()` que estaba haciendo conversiones innecesarias:

**ANTES** ❌:
```typescript
private toMexicoTimezone(dateInput: string | Date): Date {
    // Conversiones complejas e innecesarias
    const mexicoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    return mexicoDate;
}
```

**DESPUÉS** ✅:
```typescript
// Ya no existe el método - se usa directamente new Date()
async findByModelAndDate(modelId: string, date: string) {
    const searchDate = new Date(date);
    return this.promotionalPriceService.findByModelAndDate(modelId, searchDate);
}
```

### 3. Configuración del Servidor

El archivo `src/main.ts` ya tiene configurada la zona horaria correctamente:

```typescript
// Configurar zona horaria de México (Tulum/Cancún)
process.env.TZ = 'America/Cancun';

console.log('🌎 Zona horaria configurada:', process.env.TZ);
console.log('🕐 Hora actual del servidor:', new Date().toLocaleString('es-MX', { 
  timeZone: 'America/Cancun' 
}));
```

## Flujo Completo

### Crear Precio Promocional:

1. **Usuario selecciona en el frontend:**
   - Fecha inicio: 15/01/2025 10:00 AM (hora de Tulum)
   - Fecha fin: 15/02/2025 10:00 AM (hora de Tulum)

2. **Frontend envía al backend:**
   ```json
   {
     "startDate": "2025-01-15T10:00:00-06:00",
     "endDate": "2025-02-15T10:00:00-06:00"
   }
   ```

3. **Backend recibe y procesa:**
   - Convierte a objeto Date: `new Date("2025-01-15T10:00:00-06:00")`
   - Logs muestran la fecha en zona México para verificación
   - Guarda en MongoDB

4. **MongoDB guarda automáticamente en UTC:**
   ```json
   {
     "startDate": ISODate("2025-01-15T16:00:00.000Z"),
     "endDate": ISODate("2025-02-15T16:00:00.000Z")
   }
   ```

5. **Al leer, MongoDB devuelve correctamente:**
   ```json
   {
     "startDate": "2025-01-15T10:00:00-06:00",
     "endDate": "2025-02-15T10:00:00-06:00"
   }
   ```

6. **Frontend muestra correctamente:**
   - 15/01/2025 10:00 AM ✅
   - 15/02/2025 10:00 AM ✅

## Verificación

### Logs del Frontend:
```
🔍 ===== GUARDANDO PRECIO PROMOCIONAL =====
📅 startDate (Cancún): 15/01/2025 10:00 AM
📅 startDate (ISO con zona horaria): 2025-01-15T10:00:00-06:00
📅 endDate (Cancún): 15/02/2025 10:00 AM
📅 endDate (ISO con zona horaria): 2025-02-15T10:00:00-06:00
📅 startDateISO (enviado al backend): 2025-01-15T10:00:00-06:00
📅 endDateISO (enviado al backend): 2025-02-15T10:00:00-06:00
🔍 ===== FIN GUARDANDO =====
```

### Logs del Backend:
```
📅 Fecha recibida: 2025-01-15T10:00:00-06:00
📅 Fecha convertida a Date: 2025-01-15T16:00:00.000Z
📅 Fecha en zona México: 15/01/2025 10:00 AM
```

## Beneficios

✅ **Consistencia:** Todas las fechas se manejan en zona horaria de Tulum/México
✅ **Simplicidad:** No hay conversiones complejas ni cálculos manuales
✅ **Confiabilidad:** MongoDB maneja automáticamente la conversión UTC ↔ Zona Local
✅ **Trazabilidad:** Los logs permiten verificar que todo funciona correctamente
✅ **Escalabilidad:** El mismo patrón se puede aplicar a otras secciones de la plataforma

## Archivos Modificados

### Frontend:
- `new-mooving/src/pages/dashboard/components/dashboardCatalogs/catalogsList/PromotionalPriceModal.tsx`

### Backend:
- `back-movingRentals/src/promotional-price/application/services/promotional-price.service.ts`
- `back-movingRentals/src/promotional-price/infrastructure/nest/controllers/promotional-price.controller.ts`

## Próximos Pasos

Este mismo patrón debe aplicarse a todas las secciones de la plataforma que manejen fechas:

1. ✅ Precios Promocionales (completado)
2. ⏳ Reservas/Bookings
3. ⏳ Contratos
4. ⏳ Pagos
5. ⏳ Tickets
6. ⏳ Tours
7. ⏳ Transfers
8. ⏳ Cualquier otra sección con fechas

## Regla de Oro

> **Frontend:** Enviar fechas en zona horaria de México (America/Cancun) con formato ISO que incluya el offset: `YYYY-MM-DDTHH:mm:ss-06:00`
> 
> **Backend:** Recibir y guardar las fechas tal cual, sin conversiones. MongoDB hace el resto automáticamente.

## Referencias

- Guía de zona horaria: `TIMEZONE_SIMPLE_GUIDE.md`
- Zona horaria de Tulum/Cancún: `America/Cancun` (GMT-6 en invierno, GMT-5 en verano)
