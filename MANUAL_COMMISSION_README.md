# Comisiones Manuales - Documentación

## 📋 Resumen
Se ha implementado un sistema para proteger las comisiones creadas manualmente de ser recalculadas automáticamente cuando se modifica la renta.

---

## 🔧 Cambios Implementados

### 1. Nuevo Campo en el Schema de Comisión

Se agregó el campo `isManual` al schema de comisión:

```typescript
@Prop({ type: Boolean, default: false })
isManual?: boolean;
```

**Propósito**: Identificar si una comisión fue creada con un monto fijo (manual) o calculada automáticamente con porcentaje.

---

## 🎯 Comportamiento del Sistema

### Creación de Comisiones

#### Opción A: Comisión Manual (Monto Fijo)
```json
{
  "extension": {
    "extensionAmount": 5000,
    "commissionTotal": 3500,  // ← Monto fijo
    "paymentMethod": "675fa9793bd6a09da4eb1865"
  }
}
```

**Resultado**:
- Se crea la comisión con `amount: 3500`
- Se marca como `isManual: true`
- **NO se recalculará** si se modifica la renta

#### Opción B: Comisión Automática (Porcentaje)
```json
{
  "extension": {
    "extensionAmount": 5000,
    "commissionPercentage": 15,  // ← Porcentaje
    "paymentMethod": "675fa9793bd6a09da4eb1865"
  }
}
```

**Resultado**:
- Se calcula: `5000 * 15% = 750`
- Se marca como `isManual: false`
- **SÍ se recalculará** si se modifica la renta

---

## 🔄 Actualización de Rentas

### Escenario 1: Comisión Manual
```
Estado Inicial:
- Renta: $5,000
- Comisión: $3,500 (manual)
- isManual: true

Usuario modifica la renta a $6,000

Estado Final:
- Renta: $6,000
- Comisión: $3,500 ← NO CAMBIA
- isManual: true
```

### Escenario 2: Comisión Automática
```
Estado Inicial:
- Renta: $5,000
- Comisión: $750 (15% automático)
- isManual: false

Usuario modifica la renta a $6,000

Estado Final:
- Renta: $6,000
- Comisión: $900 ← SE RECALCULA (6000 * 15%)
- isManual: false
```

---

## 💻 Implementación Técnica

### 1. Modelo de Comisión

```typescript
export class CommissionModel extends BaseModel {
  private _isManual?: boolean;
  
  // ...
  
  static create(data: any): CommissionModel {
    const m = new CommissionModel(new Identifier(data._id));
    // ...
    m._isManual = data.isManual ?? false;
    return m;
  }
}
```

### 2. Servicio de Contratos

```typescript
// Al crear comisión de extensión
const calculationMethod = commissionTotal && commissionTotal > 0 
  ? 'fixed' 
  : 'percentage';

const commissionCreated = await this.commissionRepository.create(
  CommissionModel.create({
    // ...
    amount: commissionAmount,
    isManual: calculationMethod === 'fixed', // ← Marca como manual
  })
);
```

### 3. Repositorio de Comisiones

```typescript
async updateByBookingNumber(bookingNumber: number, updates: Partial<any>): Promise<CommissionModel[]> {
  // Buscar comisiones que NO sean manuales
  const commissions = await this.commissionDB.find({
    bookingNumber,
    $or: [
      { source: 'booking' },
      { source: { $exists: false } }
    ],
    $and: [
      {
        $or: [
          { isManual: false },           // ← Solo comisiones automáticas
          { isManual: { $exists: false } } // ← Retrocompatibilidad
        ]
      }
    ]
  });
  
  // Solo actualiza las comisiones automáticas
  // ...
}
```

---

## 📊 Casos de Uso

### Caso 1: Renta en Moneda Extranjera

**Problema**: La renta está en USD pero las comisiones se pagan en MXN.

**Solución**:
```typescript
// Frontend calcula el monto en MXN manualmente
const rentaUSD = 250;
const tipoCambio = 20;
const comisionMXN = rentaUSD * tipoCambio * 0.15; // $750 MXN

// Envía comisión manual
{
  "extension": {
    "extensionAmount": 5000,
    "commissionTotal": 750  // ← Monto fijo en MXN
  }
}
```

### Caso 2: Comisión Negociada

**Problema**: Se negoció una comisión fija con el concierge.

**Solución**:
```typescript
// Envía el monto negociado
{
  "extension": {
    "extensionAmount": 5000,
    "commissionTotal": 500  // ← Monto negociado
  }
}
```

### Caso 3: Ajuste por Error de Precio

**Problema**: El precio de la renta estaba mal y se corrige después.

**Solución**:
- Si la comisión es **manual**: NO se recalcula automáticamente
- Si la comisión es **automática**: SÍ se recalcula automáticamente

---

## 🔍 Identificar Comisiones Manuales

### En la Base de Datos
```javascript
// MongoDB Query
db.commission.find({ isManual: true })
```

### En el Frontend
```typescript
interface Commission {
  _id: string;
  amount: number;
  commissionPercentage?: number;
  isManual: boolean;  // ← Indica si es manual
}

// Mostrar indicador visual
const CommissionItem = ({ commission }) => (
  <div>
    <span>Comisión: ${commission.amount}</span>
    {commission.isManual && (
      <span className="badge">Manual</span>
    )}
  </div>
);
```

---

## 🎨 Recomendaciones para el Frontend

### 1. Indicador Visual

Mostrar claramente cuando una comisión es manual:

```tsx
<div className="commission-item">
  <div className="commission-amount">
    ${commission.amount} MXN
  </div>
  {commission.isManual ? (
    <span className="badge badge-warning">
      🔒 Manual
    </span>
  ) : (
    <span className="badge badge-info">
      🔄 Automática ({commission.commissionPercentage}%)
    </span>
  )}
</div>
```

### 2. Advertencia al Editar

Mostrar advertencia cuando se intenta modificar una renta con comisión manual:

```tsx
{hasManualCommission && (
  <div className="alert alert-warning">
    ⚠️ Esta renta tiene una comisión manual de ${manualCommissionAmount}.
    Al modificar la renta, la comisión NO se recalculará automáticamente.
  </div>
)}
```

### 3. Opción de Recalcular

Dar opción al usuario de convertir una comisión manual en automática:

```tsx
<button onClick={convertToAutomatic}>
  Convertir a comisión automática
</button>
```

---

## 📝 Logs y Debugging

### Logs en Creación de Comisión

```
[ContractService] Creating extension commission: {
  extensionAmount: 5000,
  commissionTotal: 3500,
  commissionAmount: 3500,
  calculationMethod: 'fixed',  // ← Indica que es manual
  ...
}
```

### Logs en Actualización de Booking

```
[CommissionRepository] Found 2 commissions to update for booking number: 12345
[CommissionRepository] Skipping manual commission: 675fa9793bd6a09da4eb1866
[CommissionRepository] Updating automatic commission: 675fa9793bd6a09da4eb1867
```

---

## 🔄 Migración de Datos Existentes

Para comisiones existentes sin el campo `isManual`:

```javascript
// MongoDB Migration Script
db.commission.updateMany(
  { isManual: { $exists: false } },
  { $set: { isManual: false } }
)
```

**Nota**: Por defecto, las comisiones existentes se tratarán como automáticas (retrocompatibilidad).

---

## ⚠️ Consideraciones Importantes

1. **Edición Manual**: Las comisiones manuales solo se pueden editar manualmente usando el endpoint `PATCH /api/v1/commissions/:id`

2. **No Retroactivo**: El cambio de `isManual` no afecta comisiones ya creadas

3. **Auditoría**: Considerar agregar logs de quién y cuándo se creó una comisión manual

4. **Permisos**: Solo usuarios con permisos adecuados deberían poder crear comisiones manuales

---

## 🧪 Testing

### Test 1: Crear Comisión Manual
```typescript
it('should create manual commission with fixed amount', async () => {
  const result = await createExtension({
    extensionAmount: 5000,
    commissionTotal: 3500
  });
  
  expect(result.commission.amount).toBe(3500);
  expect(result.commission.isManual).toBe(true);
});
```

### Test 2: No Recalcular Comisión Manual
```typescript
it('should not recalculate manual commission on booking update', async () => {
  // Crear comisión manual
  const commission = await createManualCommission(3500);
  
  // Actualizar booking
  await updateBooking({ total: 6000 });
  
  // Verificar que la comisión no cambió
  const updated = await getCommission(commission.id);
  expect(updated.amount).toBe(3500); // ← No cambió
});
```

### Test 3: Recalcular Comisión Automática
```typescript
it('should recalculate automatic commission on booking update', async () => {
  // Crear comisión automática (15%)
  const commission = await createAutoCommission(5000, 15);
  expect(commission.amount).toBe(750);
  
  // Actualizar booking
  await updateBooking({ total: 6000 });
  
  // Verificar que la comisión se recalculó
  const updated = await getCommission(commission.id);
  expect(updated.amount).toBe(900); // ← 6000 * 15%
});
```

---

## 📚 Referencias

- **Schema**: `src/core/infrastructure/mongo/schemas/public/commission.schema.ts`
- **Modelo**: `src/commission/domain/models/commission.model.ts`
- **Servicio**: `src/contract/application/services/contract.service.ts`
- **Repositorio**: `src/commission/infrastructure/mongo/repositories/commission.repository.ts`

---

## 🎯 Resumen

| Tipo | commissionTotal | isManual | Se Recalcula |
|------|----------------|----------|--------------|
| Manual | > 0 | true | ❌ NO |
| Automática | undefined/0 | false | ✅ SÍ |

**Regla de Oro**: Si `isManual: true`, la comisión NUNCA se recalcula automáticamente.
