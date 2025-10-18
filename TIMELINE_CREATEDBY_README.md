# Campo createdBy en el Timeline de Contratos

## Descripción

Se ha agregado un campo virtual `createdBy` al schema de `ContractHistory` para facilitar la identificación de quién realizó cada movimiento en el timeline de un contrato.

## Formato del Campo

El campo `createdBy` es un campo virtual que combina la información del usuario que realizó el movimiento en el siguiente formato:

```
nombre apellido - email
```

### Ejemplos:
- `Juan Pérez - juan.perez@example.com`
- `María González - maria.gonzalez@example.com`
- `john.doe@example.com` (cuando no hay nombre/apellido disponible)
- `Usuario desconocido` (cuando no hay información del usuario)

## Implementación Técnica

### Schema (contract-history.schema.ts)

El campo `createdBy` es un campo virtual de Mongoose que se calcula automáticamente a partir del campo `performedBy`:

```typescript
ContractHistorySchema.virtual('createdBy').get(function() {
  if (this.performedBy && typeof this.performedBy === 'object') {
    const user = this.performedBy as any;
    const name = user.name || '';
    const lastName = user.lastName || '';
    const email = user.email || '';
    
    if (name || lastName) {
      return `${name} ${lastName}`.trim() + (email ? ` - ${email}` : '');
    }
    return email || 'Usuario desconocido';
  }
  return 'Usuario desconocido';
});
```

### Configuración del Schema

Para que el campo virtual se incluya en las respuestas JSON:

```typescript
ContractHistorySchema.set('toJSON', { virtuals: true });
ContractHistorySchema.set('toObject', { virtuals: true });
```

## Uso en el API

### Endpoint: GET /contract/:id

Cuando consultas un contrato por ID, el timeline incluirá automáticamente el campo `createdBy`:

```json
{
  "_id": "contract_id",
  "timeline": [
    {
      "_id": "history_entry_id",
      "action": "CONTRACT_CREATED",
      "details": "El contrato fue creado.",
      "performedBy": {
        "_id": "user_id",
        "name": "Juan",
        "lastName": "Pérez",
        "email": "juan.perez@example.com"
      },
      "createdBy": "Juan Pérez - juan.perez@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Endpoint: GET /contract/:id/deleted-history

Los movimientos eliminados también incluyen el campo `createdBy`:

```json
{
  "success": true,
  "message": "Movimientos eliminados obtenidos exitosamente",
  "data": [
    {
      "_id": "history_entry_id",
      "action": "NOTE_ADDED",
      "details": "Nota agregada",
      "performedBy": {
        "_id": "user_id",
        "name": "María",
        "lastName": "González",
        "email": "maria.gonzalez@example.com"
      },
      "createdBy": "María González - maria.gonzalez@example.com",
      "deletedBy": {
        "_id": "admin_id",
        "name": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "deletedAt": "2024-01-16T14:20:00.000Z",
      "deletionReason": "Movimiento duplicado",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

## Ventajas

1. **Simplicidad**: Un solo campo con toda la información del usuario en formato legible
2. **Compatibilidad**: No afecta los datos existentes, es un campo calculado
3. **Consistencia**: Siempre devuelve un string, incluso cuando falta información
4. **Performance**: No requiere consultas adicionales, se calcula a partir de datos ya poblados

## Campo deletedByInfo

Cuando un movimiento es eliminado (soft delete), se registra automáticamente quién lo eliminó en el campo `deletedByInfo` con el mismo formato:

```json
{
  "_id": "history_entry_id",
  "action": "NOTE_ADDED",
  "details": "Nota agregada",
  "createdBy": "María González - maria.gonzalez@example.com",
  "isDeleted": true,
  "deletedBy": "admin_user_id",
  "deletedByInfo": "Admin User - admin@example.com",
  "deletedAt": "2024-01-16T14:20:00.000Z",
  "deletionReason": "Movimiento duplicado"
}
```

## Notas Importantes

- El campo `createdBy` se **almacena en la base de datos** cuando se crea el movimiento
- El campo `deletedByInfo` se **almacena en la base de datos** cuando se elimina el movimiento
- Ambos campos se calculan a partir de la información del usuario en la colección `users`
- Los campos se incluyen automáticamente en todas las respuestas JSON del timeline
- Los logs en consola muestran el proceso de cálculo de estos campos para debugging

## Migración

No se requiere migración de datos para registros existentes. Los nuevos movimientos incluirán automáticamente el campo `createdBy`, y cuando se eliminen movimientos se agregará el campo `deletedByInfo`.
