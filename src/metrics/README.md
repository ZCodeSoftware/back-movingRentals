# Módulo de Métricas

Este módulo proporciona endpoints para obtener métricas del sistema, disponibles únicamente para usuarios con rol SUPERADMIN.

## Arquitectura

El módulo sigue la arquitectura hexagonal del proyecto:

- **Domain**: Contiene las interfaces, tipos y modelos de dominio
- **Application**: Contiene los servicios de aplicación
- **Infrastructure**: Contiene la implementación de repositorios y controladores

## Endpoints Disponibles

### 1. Métricas Generales
`GET /metrics/general`

Retorna métricas con comparación al período anterior:
- Cantidad de clientes activos (con comparación)
- Ingresos totales (de reservas completas, con comparación)
- Cantidad de vehículos activos (con comparación)
- Cantidad de reservas del período (con comparación)

Cada métrica incluye:
- `current`: Valor actual
- `previous`: Valor del período anterior
- `percentageChange`: Porcentaje de cambio
- `trend`: 'up', 'down', o 'stable'

**Comparaciones por defecto:**
- Sin filtro de fecha: Mes actual vs mes anterior
- Con filtro 'day': Día actual vs día anterior
- Con filtro 'week': Semana actual vs semana anterior
- Con filtro 'month': Mes actual vs mes anterior
- Con filtro 'year': Año actual vs año anterior
- Con filtro 'range': Período especificado vs período anterior de igual duración

### 2. Ingresos por Categoría
`GET /metrics/category-revenue`

Retorna los ingresos generados por cada categoría de vehículos/servicios.

### 3. Utilización por Categoría
`GET /metrics/category-utilization`

Retorna el porcentaje de utilización de cada categoría.

### 4. Duraciones de Reservas
`GET /metrics/booking-durations`

Retorna las 4 duraciones de reservas más comunes.

### 5. Vehículos Populares
`GET /metrics/popular-vehicles`

Retorna los vehículos más populares con datos de ingresos y cantidad de reservas.

## Filtros Disponibles

Todos los endpoints soportan los siguientes filtros como query parameters:

### Filtros de Fecha
- `dateFilterType`: 'day' | 'week' | 'month' | 'year' | 'range'
- `startDate`: Fecha de inicio (formato ISO) - requerido si dateFilterType es 'range'
- `endDate`: Fecha de fin (formato ISO) - requerido si dateFilterType es 'range'

### Filtros de Precio
- `minPrice`: Precio mínimo
- `maxPrice`: Precio máximo

### Otros Filtros
- `vehicleType`: Nombre de la categoría de vehículo
- `bookingStatus`: Estado de la reserva
- `clientType`: 'new' | 'recurring' (nuevo: menos de 3 reservas, recurrente: 3 o más reservas)
- `location`: Ubicación (para transfers)

## Ejemplos de Uso

### Métricas generales del último mes
```
GET /metrics/general?dateFilterType=month
```

### Ingresos por categoría en un rango de fechas específico
```
GET /metrics/category-revenue?dateFilterType=range&startDate=2024-01-01&endDate=2024-01-31
```

### Vehículos populares de una categoría específica
```
GET /metrics/popular-vehicles?vehicleType=SUV&dateFilterType=year
```

### Utilización de categorías para clientes nuevos
```
GET /metrics/category-utilization?clientType=new&dateFilterType=month
```

## Autenticación y Autorización

- **Autenticación**: Requerida (JWT token)
- **Autorización**: Solo usuarios con rol SUPERADMIN
- **Headers requeridos**: `Authorization: Bearer <token>`

## Respuestas

Todas las respuestas están en formato JSON. En caso de error, se retorna un objeto con el mensaje de error correspondiente.

## Notas Técnicas

- Las consultas utilizan agregaciones de MongoDB para optimizar el rendimiento
- Los filtros se aplican a nivel de base de datos para mejorar la eficiencia
- Las fechas se manejan en UTC
- Los ingresos se calculan solo de reservas con estado 'completed'
- La utilización se calcula como: (reservas de la categoría / vehículos activos de la categoría) * 100
- Las comparaciones se calculan automáticamente basadas en el filtro de fecha aplicado