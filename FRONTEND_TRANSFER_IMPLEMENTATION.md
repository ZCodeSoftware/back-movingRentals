# 📋 Guía de Implementación Frontend - Campos de Vuelo para Transfers

## ✅ Cambios Completados en el Backend

Se han actualizado **TODOS** los templates de email y schemas para incluir los campos de aerolínea y número de vuelo en los transfers:

### Archivos Modificados:
1. ✅ `src/core/infrastructure/mongo/schemas/public/cart.schema.ts`
2. ✅ `src/cart/infrastructure/nest/dtos/cart.dto.ts`
3. ✅ `src/notification/infrastructure/provider/user-email/user-booking-content.template.ts` (ES)
4. ✅ `src/notification/infrastructure/provider/user-email/user-booking-content-en.template.ts` (EN)

---

## 🎯 Lo que el Frontend DEBE Implementar

### 1. **Agregar Campos en el Formulario de Transfer**

Cuando el usuario selecciona un transfer, debe ingresar:

```typescript
interface TransferFormData {
  transfer: string;              // ID del transfer
  date: Date;                    // Fecha y hora del transfer
  passengers: {
    adults: number;
    child: number;
  };
  quantity: number;
  airline: string;               // ← NUEVO: Obligatorio
  flightNumber: string;          // ← NUEVO: Obligatorio
}
```

### 2. **Componente de Formulario (React/TypeScript)**

```tsx
import React, { useState } from 'react';

interface TransferFormProps {
  onAddTransfer: (transfer: TransferData) => void;
  availableTransfers: Transfer[];
}

interface TransferData {
  transfer: string;
  date: Date;
  passengers: { adults: number; child: number };
  quantity: number;
  airline: string;
  flightNumber: string;
}

const TransferForm: React.FC<TransferFormProps> = ({ 
  onAddTransfer, 
  availableTransfers 
}) => {
  const [formData, setFormData] = useState<TransferData>({
    transfer: '',
    date: new Date(),
    passengers: { adults: 1, child: 0 },
    quantity: 1,
    airline: '',
    flightNumber: ''
  });

  const [errors, setErrors] = useState<{
    airline?: string;
    flightNumber?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validar aerolínea
    if (!formData.airline || formData.airline.trim() === '') {
      newErrors.airline = 'La aerolínea es obligatoria';
    }

    // Validar número de vuelo
    if (!formData.flightNumber || formData.flightNumber.trim() === '') {
      newErrors.flightNumber = 'El número de vuelo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onAddTransfer(formData);
      // Reset form
      setFormData({
        transfer: '',
        date: new Date(),
        passengers: { adults: 1, child: 0 },
        quantity: 1,
        airline: '',
        flightNumber: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transfer-form">
      <h3>Agregar Transfer</h3>
      
      {/* Select de Transfer */}
      <div className="form-group">
        <label htmlFor="transfer">Transfer *</label>
        <select
          id="transfer"
          value={formData.transfer}
          onChange={(e) => setFormData({ ...formData, transfer: e.target.value })}
          required
        >
          <option value="">Selecciona un transfer</option>
          {availableTransfers.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Fecha y hora */}
      <div className="form-group">
        <label htmlFor="date">Fecha y hora *</label>
        <input
          id="date"
          type="datetime-local"
          value={formData.date.toISOString().slice(0, 16)}
          onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
          required
        />
      </div>

      {/* Pasajeros */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="adults">Adultos *</label>
          <input
            id="adults"
            type="number"
            min="1"
            value={formData.passengers.adults}
            onChange={(e) => setFormData({ 
              ...formData, 
              passengers: { ...formData.passengers, adults: parseInt(e.target.value) }
            })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="children">Niños</label>
          <input
            id="children"
            type="number"
            min="0"
            value={formData.passengers.child}
            onChange={(e) => setFormData({ 
              ...formData, 
              passengers: { ...formData.passengers, child: parseInt(e.target.value) }
            })}
          />
        </div>
      </div>

      {/* NUEVOS CAMPOS: Información de Vuelo */}
      <div className="flight-info-section">
        <h4>✈️ Información de Vuelo</h4>
        
        <div className="form-group">
          <label htmlFor="airline">
            Aerolínea <span className="required">*</span>
          </label>
          <input
            id="airline"
            type="text"
            value={formData.airline}
            onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
            placeholder="Ej: Aeroméxico, Volaris, American Airlines"
            className={errors.airline ? 'error' : ''}
          />
          {errors.airline && (
            <span className="error-message">{errors.airline}</span>
          )}
          <small className="help-text">
            Ingresa el nombre de la aerolínea
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="flightNumber">
            Número de Vuelo <span className="required">*</span>
          </label>
          <input
            id="flightNumber"
            type="text"
            value={formData.flightNumber}
            onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
            placeholder="Ej: AM123, Y4567, AA1234"
            className={errors.flightNumber ? 'error' : ''}
          />
          {errors.flightNumber && (
            <span className="error-message">{errors.flightNumber}</span>
          )}
          <small className="help-text">
            Código de aerolínea + número (ej: AM123)
          </small>
        </div>
      </div>

      <button type="submit" className="btn-primary">
        Agregar Transfer al Carrito
      </button>
    </form>
  );
};

export default TransferForm;
```

### 3. **CSS Sugerido**

```css
.transfer-form {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group .required {
  color: #e74c3c;
  margin-left: 2px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-group input.error {
  border-color: #e74c3c;
}

.error-message {
  display: block;
  margin-top: 5px;
  color: #e74c3c;
  font-size: 12px;
  font-weight: 500;
}

.help-text {
  display: block;
  margin-top: 5px;
  color: #7f8c8d;
  font-size: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.flight-info-section {
  margin-top: 25px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #e67e22;
}

.flight-info-section h4 {
  margin: 0 0 15px 0;
  color: #e67e22;
  font-size: 16px;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 20px;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
```

### 4. **Payload para Actualizar el Carrito**

```typescript
// Endpoint: PUT/PATCH /api/v1/cart/:cartId
const updateCart = async (cartId: string, cartData: CartData) => {
  const response = await fetch(`/api/v1/cart/${cartId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      branch: cartData.branch,
      transfer: cartData.transfers.map(t => ({
        transfer: t.transfer,
        date: t.date,
        passengers: t.passengers,
        quantity: t.quantity,
        total: t.total,
        airline: t.airline,        // ← OBLIGATORIO
        flightNumber: t.flightNumber  // ← OBLIGATORIO
      })),
      selectedItems: cartData.vehicles,
      selectedTours: cartData.tours,
      selectedTickets: cartData.tickets
    })
  });

  return response.json();
};
```

### 5. **Ejemplo de Payload Completo**

```json
{
  "branch": "675fa9793bd6a09da4eb1865",
  "transfer": [
    {
      "transfer": "675fa9793bd6a09da4eb1866",
      "date": "2025-12-15T10:00:00.000Z",
      "passengers": {
        "adults": 2,
        "child": 1
      },
      "quantity": 1,
      "total": 1500,
      "airline": "Aeroméxico",
      "flightNumber": "AM123"
    }
  ],
  "selectedItems": [],
  "selectedTours": [],
  "selectedTickets": []
}
```

---

## 📱 Resumen del Carrito

Actualizar la vista del resumen del carrito para mostrar la información de vuelo:

```tsx
const TransferCartItem: React.FC<{ transfer: TransferInCart }> = ({ transfer }) => {
  return (
    <div className="cart-item transfer-item">
      <div className="item-header">
        <h4>🚐 {transfer.name}</h4>
        <span className="price">${transfer.price} MXN</span>
      </div>
      
      <div className="item-details">
        <p><strong>Fecha:</strong> {formatDate(transfer.date)}</p>
        <p><strong>Pasajeros:</strong> {transfer.passengers.adults} adultos, {transfer.passengers.child} niños</p>
        
        {/* NUEVA SECCIÓN: Información de Vuelo */}
        <div className="flight-info">
          <p className="flight-label">✈️ Información de Vuelo</p>
          <p><strong>Aerolínea:</strong> {transfer.airline}</p>
          <p><strong>Vuelo:</strong> {transfer.flightNumber}</p>
        </div>
      </div>
    </div>
  );
};
```

---

## ✅ Checklist de Implementación

### Formulario de Transfer
- [ ] Agregar campo de texto para "Aerolínea"
- [ ] Agregar campo de texto para "Número de Vuelo"
- [ ] Marcar ambos campos como obligatorios (*)
- [ ] Agregar validación: no permitir strings vacíos
- [ ] Agregar mensajes de error si los campos están vacíos
- [ ] Agregar placeholders con ejemplos
- [ ] Agregar texto de ayuda (help text)

### Resumen del Carrito
- [ ] Mostrar aerolínea en el resumen
- [ ] Mostrar número de vuelo en el resumen
- [ ] Agregar icono ✈️ para identificar la sección
- [ ] Aplicar estilos visuales distintivos

### Integración con API
- [ ] Incluir `airline` en el payload al agregar transfer
- [ ] Incluir `flightNumber` en el payload al agregar transfer
- [ ] Validar que ambos campos se envíen antes de hacer la petición
- [ ] Manejar errores de validación del backend

### Testing
- [ ] Probar agregar transfer sin aerolínea (debe fallar)
- [ ] Probar agregar transfer sin número de vuelo (debe fallar)
- [ ] Probar agregar transfer con ambos campos (debe funcionar)
- [ ] Verificar que los datos se muestren en el resumen
- [ ] Verificar que los datos lleguen al email de confirmación

---

## 🎨 Diseño Visual Sugerido

### Sección de Información de Vuelo en el Formulario:
```
┌─────────────────────────────────────────┐
│ ✈️ Información de Vuelo                 │
├─────────────────────────────────────────┤
│                                         │
│ Aerolínea *                             │
│ ┌─────────────────────────────────────┐ │
│ │ Ej: Aeroméxico, Volaris...          │ │
│ └─────────────────────────────────────┘ │
│ Ingresa el nombre de la aerolínea       │
│                                         │
│ Número de Vuelo *                       │
│ ┌─────────────────────────────────────┐ │
│ │ Ej: AM123, Y4567, AA1234            │ │
│ └─────────────────────────────────────┘ │
│ Código de aerolínea + número            │
│                                         │
└─────────────────────────────────────────┘
```

### En el Resumen del Carrito:
```
┌─────────────────────────────────────────┐
│ 🚐 Transfer Aeropuerto - Hotel          │
│ $1,500 MXN                              │
├─────────────────────────────────────────┤
│ Fecha: 15 de diciembre, 10:00 AM        │
│ Pasajeros: 2 adultos, 1 niño            │
│                                         │
│ ✈️ Información de Vuelo                 │
│ Aerolínea: Aeroméxico                   │
│ Vuelo: AM123                            │
└─────────────────────────────────────────┘
```

---

## 🔍 Validaciones Requeridas

### Frontend (Antes de enviar):
```typescript
const validateTransfer = (transfer: TransferData): string[] => {
  const errors: string[] = [];
  
  if (!transfer.airline || transfer.airline.trim() === '') {
    errors.push('La aerolínea es obligatoria');
  }
  
  if (!transfer.flightNumber || transfer.flightNumber.trim() === '') {
    errors.push('El número de vuelo es obligatorio');
  }
  
  if (transfer.airline && transfer.airline.length > 100) {
    errors.push('El nombre de la aerolínea es demasiado largo');
  }
  
  if (transfer.flightNumber && transfer.flightNumber.length > 20) {
    errors.push('El número de vuelo es demasiado largo');
  }
  
  return errors;
};
```

### Backend (Ya implementado):
- ✅ `@IsString()` - Debe ser un string
- ✅ `@ApiProperty()` - Documentado en Swagger
- ✅ Campos obligatorios en el schema de MongoDB

---

## 📧 Cómo se Verá en los Emails

### Email de Cliente (Español):
```
🚐 Transfer reservado:

Servicio: Transfer Aeropuerto - Hotel
Categoría: Privado
Fecha y hora: 15 de diciembre de 2025, 10:00 a.m.
Precio: 1,500.00 MXN

���️ INFORMACIÓN DE VUELO
Aerolínea: Aeroméxico
Número de vuelo: AM123
```

### Email de Cliente (Inglés):
```
🚐 Transfer booked:

Service: Airport - Hotel Transfer
Category: Private
Date and time: December 15, 2025, 10:00 AM
Price: 1,500.00 MXN

✈��� FLIGHT INFORMATION
Airline: Aeroméxico
Flight number: AM123
```

---

## ⚠️ Notas Importantes

1. **Campos Obligatorios**: Ambos campos son obligatorios. El backend rechazará peticiones sin ellos.

2. **Formato Sugerido**:
   - **Aerolínea**: Nombre completo (ej: "Aeroméxico", "Volaris", "American Airlines")
   - **Número de Vuelo**: Código de aerolínea + número (ej: "AM123", "Y4567", "AA1234")

3. **Longitud Máxima Sugerida**:
   - Aerolínea: 100 caracteres
   - Número de vuelo: 20 caracteres

4. **UX Recomendada**:
   - Mostrar los campos en una sección destacada con icono ✈️
   - Usar placeholders con ejemplos reales
   - Agregar texto de ayuda debajo de cada campo
   - Validar en tiempo real (mientras el usuario escribe)
   - Mostrar mensajes de error claros

5. **Accesibilidad**:
   - Usar labels con `for` apuntando al `id` del input
   - Marcar campos obligatorios con `required` y `aria-required="true"`
   - Asociar mensajes de error con `aria-describedby`

---

## 🚀 Próximos Pasos

1. **Implementar el formulario** con los nuevos campos
2. **Actualizar el resumen del carrito** para mostrar la información
3. **Probar el flujo completo**:
   - Agregar transfer con información de vuelo
   - Verificar que aparezca en el resumen
   - Completar la reserva
   - Verificar el email de confirmación
4. **Ajustar estilos** según el diseño de la aplicación

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa:
- `TRANSFER_FLIGHT_INFO_README.md` - Documentación técnica completa
- `src/cart/infrastructure/nest/dtos/cart.dto.ts` - DTO con validaciones
- `src/core/infrastructure/mongo/schemas/public/cart.schema.ts` - Schema de MongoDB

**Archivos de Email Actualizados**:
- ✅ `user-booking-content.template.ts` (Español)
- ✅ `user-booking-content-en.template.ts` (Inglés)
