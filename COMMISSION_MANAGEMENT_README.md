# Gestión de Comisiones - Documentación para Frontend

## 📋 Resumen
Se ha implementado la funcionalidad para:
1. **Crear comisiones con monto fijo** al hacer extensiones de contrato
2. **Editar comisiones** después de creadas

---

## 1️⃣ Crear Extensión con Comisión Manual

### Endpoint
```
PATCH/PUT /api/v1/contract/:contractId
```

### Headers
```
Authorization: Bearer <token>
```

### Body - Opción A: Comisión Manual (Monto Fijo)
```json
{
  "extension": {
    "extensionAmount": 5000,
    "paymentMethod": "675fa9793bd6a09da4eb1865",
    "paymentMedium": "CUENTA",
    "commissionTotal": 3500,  // ← NUEVO: Monto fijo de comisión en MXN
    "newEndDateTime": "2025-12-01T12:00:00.000Z"
  },
  "concierge": "68fe7a9d65e089b8e88b627e",
  "isExtension": true,
  "reasonForChange": "EXTENSION DE RENTA",
  "eventType": "68c72448518e24b76294edf4"
}
```

### Body - Opción B: Comisión Automática (Calculada con %)
```json
{
  "extension": {
    "extensionAmount": 5000,
    "paymentMethod": "675fa9793bd6a09da4eb1865",
    "paymentMedium": "CUENTA",
    "commissionPercentage": 15,  // ← Se calcula: 5000 * 15% = 750
    "newEndDateTime": "2025-12-01T12:00:00.000Z"
  },
  "concierge": "68fe7a9d65e089b8e88b627e",
  "isExtension": true,
  "reasonForChange": "EXTENSION DE RENTA",
  "eventType": "68c72448518e24b76294edf4"
}
```

### Lógica del Frontend
```typescript
interface ExtensionForm {
  extensionAmount: number;
  paymentMethod: string;
  paymentMedium?: string;
  commissionPercentage?: number;  // Porcentaje (default 15%)
  commissionTotal?: number;        // Monto fijo manual (opcional)
  newEndDateTime: string;
}

// Al enviar el formulario
const payload = {
  extension: {
    extensionAmount: formData.extensionAmount,
    paymentMethod: formData.paymentMethod,
    paymentMedium: formData.paymentMedium || 'CUENTA',
    
    // Si el usuario ingresó un monto manual, enviarlo
    ...(formData.manualCommission && formData.manualCommission > 0 
      ? { commissionTotal: formData.manualCommission }
      : { commissionPercentage: formData.commissionPercentage || 15 }
    ),
    
    newEndDateTime: formData.newEndDateTime
  },
  concierge: formData.concierge,
  isExtension: true,
  reasonForChange: "EXTENSION DE RENTA",
  eventType: "68c72448518e24b76294edf4"
};
```

### Comportamiento del Backend
- **Si `commissionTotal` > 0**: Usa ese valor exacto como comisión
- **Si `commissionTotal` no viene o es 0**: Calcula la comisión con el porcentaje
  - Si viene `commissionPercentage`, usa ese valor
  - Si no viene, usa 15% por defecto

---

## 2️⃣ Editar Comisión Existente

### Endpoint
```
PATCH /api/v1/commissions/:commissionId
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Body
```json
{
  "amount": 3500,                  // Nuevo monto de comisión (opcional)
  "commissionPercentage": 20       // Nuevo porcentaje (opcional)
}
```

### Ejemplos de Uso

#### Ejemplo 1: Cambiar solo el monto
```typescript
const updateCommission = async (commissionId: string, newAmount: number) => {
  const response = await fetch(`/api/v1/commissions/${commissionId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: newAmount
    })
  });
  
  return response.json();
};

// Uso
await updateCommission('675fa9793bd6a09da4eb1865', 4000);
```

#### Ejemplo 2: Cambiar solo el porcentaje
```typescript
await fetch(`/api/v1/commissions/${commissionId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    commissionPercentage: 18
  })
});
```

#### Ejemplo 3: Cambiar ambos
```typescript
await fetch(`/api/v1/commissions/${commissionId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 3800,
    commissionPercentage: 18
  })
});
```

### Respuesta Exitosa (200)
```json
{
  "_id": "675fa9793bd6a09da4eb1865",
  "booking": "675fa9793bd6a09da4eb1864",
  "bookingNumber": 12345,
  "user": "675fa9793bd6a09da4eb1863",
  "vehicleOwner": "68fe7a9d65e089b8e88b627e",
  "amount": 3500,
  "commissionPercentage": 20,
  "status": "PENDING",
  "source": "extension",
  "detail": "Extensión de Renta",
  "createdAt": "2025-04-11T01:00:00.000Z",
  "updatedAt": "2025-04-11T02:30:00.000Z"
}
```

### Respuestas de Error

#### 400 - Bad Request
```json
{
  "statusCode": 400,
  "message": "No valid fields to update",
  "error": "Bad Request"
}
```

#### 404 - Not Found
```json
{
  "statusCode": 404,
  "message": "Commission not found",
  "error": "Not Found"
}
```

---

## 🎨 Componente de Ejemplo para el Frontend

```typescript
import React, { useState } from 'react';

interface CommissionEditorProps {
  commissionId: string;
  currentAmount: number;
  currentPercentage?: number;
  onUpdate: () => void;
}

const CommissionEditor: React.FC<CommissionEditorProps> = ({
  commissionId,
  currentAmount,
  currentPercentage,
  onUpdate
}) => {
  const [amount, setAmount] = useState(currentAmount);
  const [percentage, setPercentage] = useState(currentPercentage || 15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          commissionPercentage: percentage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar comisión');
      }

      const data = await response.json();
      console.log('Comisión actualizada:', data);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="commission-editor">
      <h3>Editar Comisión</h3>
      
      <div className="form-group">
        <label>Monto (MXN)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Porcentaje (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={percentage}
          onChange={(e) => setPercentage(parseFloat(e.target.value))}
          disabled={loading}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button onClick={handleUpdate} disabled={loading}>
        {loading ? 'Actualizando...' : 'Actualizar Comisión'}
      </button>
    </div>
  );
};

export default CommissionEditor;
```

---

## 📝 Notas Importantes

1. **Permisos**: Solo usuarios con roles `ADMIN`, `SUPERVISOR` o `SUPERADMIN` pueden editar comisiones

2. **Validaciones**:
   - `amount` debe ser >= 0
   - `commissionPercentage` debe estar entre 0 y 100
   - Al menos uno de los dos campos debe ser enviado

3. **Logs**: El backend registra todas las actualizaciones de comisiones en consola para auditoría

4. **Prioridad en Extensiones**:
   - Si se envía `commissionTotal` > 0, se usa ese valor
   - Si no, se calcula con `commissionPercentage`
   - Si no se envía ninguno, se usa 15% por defecto

5. **Source de Comisiones**:
   - `booking`: Comisión de la reserva original
   - `extension`: Comisión de una extensión de contrato

---

## 🔍 Endpoints Relacionados

### Listar Comisiones
```
GET /api/v1/commissions?ownerId=xxx&source=extension
```

### Marcar como Pagada
```
PUT /api/v1/commissions/:id/pay
```

### Eliminar Comisión
```
DELETE /api/v1/commissions/:id
```

---

## ✅ Checklist de Implementación Frontend

- [ ] Agregar campo opcional `commissionTotal` en formulario de extensión
- [ ] Implementar lógica para elegir entre comisión manual o automática
- [ ] Crear componente/modal para editar comisiones existentes
- [ ] Agregar validaciones de entrada (monto >= 0, porcentaje 0-100)
- [ ] Mostrar mensajes de éxito/error al usuario
- [ ] Actualizar lista de comisiones después de editar
- [ ] Agregar permisos de rol en el frontend
- [ ] Implementar logs/auditoría de cambios en comisiones

---

## 🐛 Troubleshooting

### Error: "No valid fields to update"
**Causa**: No se envió ningún campo válido en el body
**Solución**: Asegúrate de enviar al menos `amount` o `commissionPercentage`

### Error: "Commission not found"
**Causa**: El ID de la comisión no existe o es inválido
**Solución**: Verifica que el ID sea correcto y que la comisión no haya sido eliminada

### Error: 401 Unauthorized
**Causa**: Token inválido o expirado
**Solución**: Refresca el token de autenticación

### Error: 403 Forbidden
**Causa**: El usuario no tiene permisos suficientes
**Solución**: Verifica que el usuario tenga rol ADMIN, SUPERVISOR o SUPERADMIN
