# Sistema de Precios Promocionales

## Descripción General

El sistema de precios promocionales permite configurar precios especiales para modelos de vehículos durante períodos específicos de tiempo. Estos precios se activan automáticamente cuando se consultan los modelos disponibles.

## Características Principales

### 1. Precios por Período de Tiempo
Cada precio promocional tiene:
- **Fecha de inicio** (`startDate`): Cuando comienza la promoción
- **Fecha de fin** (`endDate`): Cuando termina la promoción
- **Estado activo** (`isActive`): Permite activar/desactivar la promoción

### 2. Tipos de Precios Soportados
- `price`: Precio base por hora
- `pricePer4`: Precio por 4 horas
- `pricePer8`: Precio por 8 horas
- `pricePer24`: Precio por 24 horas (día completo)
- `pricePerWeek`: Precio por semana
- `pricePerMonth`: Precio por mes

### 3. Integración con Modelos
Cuando consultas el endpoint `/api/v1/cat-model`, cada modelo incluye automáticamente sus precios promocionales activos en el campo `promotionalPrices`.

## Endpoints Disponibles

### 1. Obtener Modelos con Precios Promocionales
```
GET /api/v1/cat-model?lang=es
```

**Respuesta:**
```json
[
  {
    "_id": "model_id",
    "name": "Modelo X",
    "promotionalPrices": [
      {
        "_id": "promo_id",
        "model": { ... },
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-01-31T23:59:59.999Z",
        "price": 50,
        "pricePer4": 180,
        "pricePer8": 320,
        "pricePer24": 800,
        "pricePerWeek": 5000,
        "pricePerMonth": 18000,
        "isActive": true,
        "description": "Promoción de Enero"
      }
    ]
  }
]
```

### 2. Crear Precio Promocional
```
POST /api/v1/promotional-price
Authorization: Bearer {token}
Roles: ADMIN, SUPERADMIN
```

**Body:**
```json
{
  "model": "model_id",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T23:59:59.999Z",
  "price": 50,
  "pricePer4": 180,
  "pricePer8": 320,
  "pricePer24": 800,
  "pricePerWeek": 5000,
  "pricePerMonth": 18000,
  "isActive": true,
  "description": "Promoción de Enero"
}
```

### 3. Listar Precios Promocionales
```
GET /api/v1/promotional-price
```

**Query Parameters:**
- `model`: Filtrar por ID de modelo
- `isActive`: Filtrar por estado activo (true/false)
- `startDate`: Filtrar por fecha de inicio
- `endDate`: Filtrar por fecha de fin

**Ejemplos:**
```
GET /api/v1/promotional-price?model=model_id&isActive=true
GET /api/v1/promotional-price?startDate=2024-01-01&endDate=2024-12-31
```

### 4. Obtener Precio Promocional por ID
```
GET /api/v1/promotional-price/:id
```

### 5. Obtener Precio Promocional para Modelo y Fecha Específica
```
GET /api/v1/promotional-price/model/:modelId/date/:date
```

**Ejemplo:**
```
GET /api/v1/promotional-price/model/model_id/date/2024-01-15
```

Este endpoint devuelve el precio promocional activo para un modelo en una fecha específica.

### 6. Actualizar Precio Promocional
```
PUT /api/v1/promotional-price/:id
Authorization: Bearer {token}
Roles: ADMIN, SUPERADMIN
```

**Body:** (campos opcionales)
```json
{
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-02-28T23:59:59.999Z",
  "price": 45,
  "isActive": false,
  "description": "Promoción extendida"
}
```

### 7. Eliminar Precio Promocional (Soft Delete)
```
DELETE /api/v1/promotional-price/:id
Authorization: Bearer {token}
Roles: ADMIN, SUPERADMIN
```

## Validaciones Automáticas

El sistema incluye validaciones para evitar conflictos:

1. **No solapamiento de fechas**: No se pueden crear dos promociones activas para el mismo modelo con fechas que se solapen.
2. **Fechas válidas**: La fecha de inicio debe ser anterior a la fecha de fin.
3. **Modelo existente**: El modelo debe existir en la base de datos.

## Casos de Uso

### Caso 1: Promoción de Temporada Baja
```json
{
  "model": "model_id",
  "startDate": "2024-05-01",
  "endDate": "2024-09-30",
  "pricePer24": 600,
  "pricePerWeek": 3500,
  "description": "Temporada baja - 25% descuento"
}
```

### Caso 2: Promoción de Fin de Semana
```json
{
  "model": "model_id",
  "startDate": "2024-01-05",
  "endDate": "2024-01-07",
  "pricePer24": 700,
  "description": "Especial fin de semana"
}
```

### Caso 3: Promoción de Larga Duración
```json
{
  "model": "model_id",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "pricePerWeek": 4000,
  "pricePerMonth": 15000,
  "description": "Descuento por renta prolongada"
}
```

## Flujo de Trabajo Recomendado

1. **Crear Promoción**:
   - Definir el modelo objetivo
   - Establecer fechas de inicio y fin
   - Configurar los precios promocionales
   - Activar la promoción (`isActive: true`)

2. **Consultar Disponibilidad**:
   - El frontend consulta `/api/v1/cat-model`
   - Recibe los modelos con sus precios promocionales activos
   - Muestra los precios especiales al usuario

3. **Aplicar en Reserva**:
   - Al crear una reserva, el sistema puede verificar si hay precios promocionales activos
   - Usar el endpoint `/api/v1/promotional-price/model/:modelId/date/:date` para obtener el precio correcto

4. **Gestión de Promociones**:
   - Desactivar promociones vencidas
   - Actualizar fechas o precios según necesidad
   - Eliminar promociones obsoletas

## Notas Técnicas

- Los precios promocionales se cargan automáticamente al consultar modelos
- Solo se incluyen promociones con `isActive: true`
- Las fechas se manejan en formato ISO 8601
- El sistema usa soft delete para mantener historial
- Las promociones se ordenan por fecha de inicio (más reciente primero)

## Ejemplo de Integración Frontend

```javascript
// Obtener modelos con promociones
const response = await fetch('/api/v1/cat-model?lang=es');
const models = await response.json();

models.forEach(model => {
  console.log(`Modelo: ${model.name}`);
  
  if (model.promotionalPrices && model.promotionalPrices.length > 0) {
    console.log('Promociones activas:');
    model.promotionalPrices.forEach(promo => {
      console.log(`- ${promo.description}`);
      console.log(`  Válido: ${promo.startDate} a ${promo.endDate}`);
      console.log(`  Precio por día: $${promo.pricePer24}`);
    });
  }
});
```

## Troubleshooting

### Problema: No aparecen precios promocionales
- Verificar que `isActive: true`
- Verificar que las fechas incluyan el período actual
- Verificar que el modelo esté correctamente asociado

### Problema: Error al crear promoción
- Verificar que no haya solapamiento de fechas
- Verificar que el modelo exista
- Verificar que la fecha de inicio sea anterior a la de fin

### Problema: Promoción no se aplica en reservas
- Verificar que la fecha de la reserva esté dentro del rango de la promoción
- Verificar que la promoción esté activa
- Usar el endpoint específico para verificar: `/api/v1/promotional-price/model/:modelId/date/:date`
