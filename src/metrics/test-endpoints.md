# Pruebas de Endpoints de Métricas

## Configuración de Pruebas

Para probar los endpoints, necesitas:

1. **Token de autenticación**: Un JWT token válido de un usuario con rol SUPERADMIN
2. **Headers requeridos**:
   ```
   Authorization: Bearer <tu-jwt-token>
   Content-Type: application/json
   ```

## Ejemplos de Pruebas con cURL

### 1. Métricas Generales

```bash
# Métricas generales sin filtros (compara con mes anterior por defecto)
curl -X GET "http://localhost:3000/metrics/general" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Métricas generales del último mes vs mes anterior
curl -X GET "http://localhost:3000/metrics/general?dateFilterType=month" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Métricas generales para clientes nuevos
curl -X GET "http://localhost:3000/metrics/general?clientType=new" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Métricas generales comparando rango personalizado
curl -X GET "http://localhost:3000/metrics/general?dateFilterType=range&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

### 2. Ingresos por Categoría

```bash
# Ingresos por categoría sin filtros
curl -X GET "http://localhost:3000/metrics/category-revenue" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Ingresos por categoría en rango de fechas
curl -X GET "http://localhost:3000/metrics/category-revenue?dateFilterType=range&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Ingresos por categoría con filtro de precio
curl -X GET "http://localhost:3000/metrics/category-revenue?minPrice=100&maxPrice=1000" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

### 3. Utilización por Categoría

```bash
# Utilización por categoría
curl -X GET "http://localhost:3000/metrics/category-utilization" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Utilización por categoría específica
curl -X GET "http://localhost:3000/metrics/category-utilization?vehicleType=SUV" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

### 4. Duraciones de Reservas

```bash
# Duraciones más comunes
curl -X GET "http://localhost:3000/metrics/booking-durations" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Duraciones para una categoría específica
curl -X GET "http://localhost:3000/metrics/booking-durations?vehicleType=Sedan&dateFilterType=year" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

### 5. Vehículos Populares

```bash
# Vehículos más populares
curl -X GET "http://localhost:3000/metrics/popular-vehicles" \
  -H "Authorization: Bearer <tu-jwt-token>"

# Vehículos populares con filtros
curl -X GET "http://localhost:3000/metrics/popular-vehicles?dateFilterType=month&vehicleType=SUV" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

## Ejemplos con Postman

### Configuración Base
- **Method**: GET
- **URL**: `http://localhost:3000/metrics/{endpoint}`
- **Headers**:
  - `Authorization`: `Bearer <tu-jwt-token>`
  - `Content-Type`: `application/json`

### Parámetros de Query Comunes

| Parámetro | Tipo | Valores Posibles | Ejemplo |
|-----------|------|------------------|---------|
| dateFilterType | string | day, week, month, year, range | month |
| startDate | string (ISO) | 2024-01-01T00:00:00.000Z | 2024-01-01 |
| endDate | string (ISO) | 2024-12-31T23:59:59.999Z | 2024-12-31 |
| minPrice | number | 0, 100, 500 | 100 |
| maxPrice | number | 1000, 5000 | 1000 |
| vehicleType | string | SUV, Sedan, Truck | SUV |
| bookingStatus | string | completed, pending, cancelled | completed |
| clientType | string | new, recurring | new |
| location | string | Miami, Orlando | Miami |

## Respuestas Esperadas

### Métricas Generales (CON COMPARACIONES)
```json
{
  "activeClients": {
    "current": 150,
    "previous": 140,
    "percentageChange": 7.14,
    "trend": "up"
  },
  "totalRevenue": {
    "current": 25000.50,
    "previous": 23500.00,
    "percentageChange": 6.38,
    "trend": "up"
  },
  "activeVehicles": {
    "current": 45,
    "previous": 45,
    "percentageChange": 0,
    "trend": "stable"
  },
  "monthlyBookings": {
    "current": 120,
    "previous": 110,
    "percentageChange": 9.09,
    "trend": "up"
  }
}
```

**Explicación de campos:**
- `current`: Valor del período actual
- `previous`: Valor del período anterior (mismo tamaño)
- `percentageChange`: Porcentaje de cambio ((current - previous) / previous * 100)
- `trend`: 'up' (crecimiento), 'down' (decrecimiento), 'stable' (cambio < 1%)

### Ingresos por Categoría
```json
[
  {
    "categoryId": "64a1b2c3d4e5f6789012345",
    "categoryName": "SUV",
    "revenue": 15000.00
  },
  {
    "categoryId": "64a1b2c3d4e5f6789012346",
    "categoryName": "Sedan",
    "revenue": 10000.50
  }
]
```

### Utilización por Categoría
```json
[
  {
    "categoryId": "64a1b2c3d4e5f6789012345",
    "categoryName": "SUV",
    "utilizationPercentage": 75.50,
    "totalBookings": 30,
    "totalAvailable": 40
  }
]
```

### Duraciones de Reservas
```json
[
  {
    "duration": 24,
    "count": 45
  },
  {
    "duration": 48,
    "count": 30
  },
  {
    "duration": 12,
    "count": 25
  },
  {
    "duration": 72,
    "count": 20
  }
]
```

### Vehículos Populares
```json
[
  {
    "vehicleId": "64a1b2c3d4e5f6789012345",
    "tag": "ABC-123",
    "model": "Toyota Camry",
    "categoryName": "Sedan",
    "revenue": 5000.00,
    "bookingCount": 25
  }
]
```

## Lógica de Comparaciones (Métricas Generales)

### Períodos de Comparación:
- **Sin filtro**: Mes actual vs mes anterior
- **day**: Día actual vs día anterior
- **week**: Semana actual vs semana anterior  
- **month**: Mes actual vs mes anterior
- **year**: Año actual vs año anterior
- **range**: Período especificado vs período anterior de igual duración

### Ejemplos de Comparación:
```bash
# Comparar esta semana vs semana anterior
GET /metrics/general?dateFilterType=week

# Comparar enero 2024 vs diciembre 2023 (mismo tamaño de período)
GET /metrics/general?dateFilterType=range&startDate=2024-01-01&endDate=2024-01-31
```

## Códigos de Error Comunes

- **401 Unauthorized**: Token JWT inválido o expirado
- **403 Forbidden**: Usuario no tiene rol SUPERADMIN
- **400 Bad Request**: Parámetros de query inválidos
- **500 Internal Server Error**: Error en el servidor

## Notas de Desarrollo

1. Asegúrate de que el servidor esté ejecutándose en el puerto correcto
2. Verifica que la base de datos tenga datos de prueba
3. Los filtros de fecha usan UTC por defecto
4. Los ingresos solo incluyen reservas con estado 'completed'
5. La utilización se calcula como porcentaje de uso vs disponibilidad
6. **NUEVO**: Las métricas generales incluyen comparaciones automáticas con períodos anteriores
7. Las comparaciones se calculan automáticamente según el filtro de fecha aplicado