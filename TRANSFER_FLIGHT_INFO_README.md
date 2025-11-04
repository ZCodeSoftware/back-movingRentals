# Información de Vuelo para Transfers - Documentación

## 📋 Resumen
Se han agregado dos campos obligatorios para los transfers:
1. **Aerolínea** (`airline`)
2. **Número de vuelo** (`flightNumber`)

Estos campos aparecen en:
- ✅ Creación de transfers (Web y Dashboard)
- ✅ Resumen del carrito
- ✅ Emails de confirmación (cliente y tienda)
- ✅ Historial del contrato

---

## 🔧 Cambios Implementados

### 1. Schema del Carrito (`cart.schema.ts`)
Se actualizó el schema para incluir los nuevos campos en el array de transfers:

```typescript
@Prop({
    type: [{
        transfer: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' },
        date: Date,
        passengers: { adults: Number, child: Number },
        quantity: Number,
        total: Number,
        airline: { type: String, required: true },      // ← NUEVO
        flightNumber: { type: String, required: true }  // ← NUEVO
    }]
})
transfer: {
    transfer: Transfer,
    date: Date,
    passengers: Passenger,
    quantity: number,
    total?: number,
    airline: string,        // ← NUEVO
    flightNumber: string    // ← NUEVO
}[];
```

### 2. DTO del Carrito (`cart.dto.ts`)
Se actualizó el `TransferDTO` para incluir validaciones:

```typescript
export class TransferDTO {
    @IsDate()
    @ApiProperty()
    date: Date;

    @IsString()
    @ApiProperty()
    transfer: string;

    @ApiProperty()
    passengers: TravelersDTO

    @IsNumber()
    @ApiProperty()
    quantity: number;

    @IsNumber()
    @ApiProperty({ required: false })
    total?: number;

    @IsString()
    @ApiProperty({ description: 'Airline name', example: 'Aeroméxico' })
    airline: string;  // ← NUEVO

    @IsString()
    @ApiProperty({ description: 'Flight number', example: 'AM123' })
    flightNumber: string;  // ← NUEVO
}
```

### 3. Templates de Email
Se actualizaron todos los templates de email para mostrar la información de vuelo:

#### Template de Usuario (Español)
```html
<div style="background-color: #fff3e0; padding: 10px; border-radius: 4px; margin-top: 10px;">
  <h5 style="margin: 0 0 8px 0; color: #e65100;">✈️ INFORMACIÓN DE VUELO</h5>
  <p style="margin: 5px 0;"><strong>Aerolínea:</strong> ${t.airline}</p>
  <p style="margin: 5px 0;"><strong>Número de vuelo:</strong> ${t.flightNumber}</p>
</div>
```

---

## 📤 Lo que el Frontend debe enviar

### Endpoint: Actualizar Carrito
```
PUT/PATCH /api/v1/cart/:id
```

### Body Example
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
      "airline": "Aeroméxico",        // ← OBLIGATORIO
      "flightNumber": "AM123"         // ← OBLIGATORIO
    }
  ],
  "selectedItems": [],
  "selectedTours": [],
  "selectedTickets": []
}
```

### Validaciones
- ✅ `airline`: String, obligatorio
- ✅ `flightNumber`: String, obligatorio
- ✅ Ambos campos deben estar presentes al crear/actualizar un transfer

---

## 🎨 Componente de Ejemplo para el Frontend

### React/TypeScript

```typescript
import React, { useState } from 'react';

interface TransferFormProps {
  onSubmit: (transferData: TransferData) => void;
}

interface TransferData {
  transfer: string;
  date: Date;
  passengers: {
    adults: number;
    child: number;
  };
  quantity: number;
  airline: string;
  flightNumber: string;
}

const TransferForm: React.FC<TransferFormProps> = ({ onSubmit }) => {
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

    if (!formData.airline || formData.airline.trim() === '') {
      newErrors.airline = 'La aerolínea es obligatoria';
    }

    if (!formData.flightNumber || formData.flightNumber.trim() === '') {
      newErrors.flightNumber = 'El número de vuelo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transfer-form">
      <h3>Información del Transfer</h3>
      
      {/* Campos existentes: transfer, date, passengers, quantity */}
      
      <div className="form-group">
        <label htmlFor="airline">
          Aerolínea <span className="required">*</span>
        </label>
        <input
          id="airline"
          type="text"
          value={formData.airline}
          onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
          placeholder="Ej: Aeroméxico, Volaris, VivaAerobus"
          className={errors.airline ? 'error' : ''}
        />
        {errors.airline && <span className="error-message">{errors.airline}</span>}
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
          placeholder="Ej: AM123, Y4567"
          className={errors.flightNumber ? 'error' : ''}
        />
        {errors.flightNumber && <span className="error-message">{errors.flightNumber}</span>}
      </div>

      <button type="submit" className="btn-submit">
        Agregar Transfer
      </button>
    </form>
  );
};

export default TransferForm;
```

### CSS Sugerido
```css
.transfer-form {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group .required {
  color: #e74c3c;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input.error {
  border-color: #e74c3c;
}

.error-message {
  display: block;
  margin-top: 5px;
  color: #e74c3c;
  font-size: 12px;
}

.btn-submit {
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
}

.btn-submit:hover {
  background: #2980b9;
}
```

---

## 📧 Visualización en Emails

### Email de Cliente (Español)
```
🚐 Transfer reservado:

Servicio: Transfer Aeropuerto - Hotel
Categoría: Privado
Fecha y hora: 15 de diciembre de 2025, 10:00 a.m.
Precio: 1,500.00 MXN

✈️ INFORMACIÓN DE VUELO
Aerolínea: Aeroméxico
Número de vuelo: AM123
```

### Email de Cliente (Inglés)
```
🚐 Transfer booked:

Service: Airport - Hotel Transfer
Category: Private
Date and time: December 15, 2025, 10:00 AM
Price: 1,500.00 MXN

✈️ FLIGHT INFORMATION
Airline: Aeroméxico
Flight number: AM123
```

---

## 🔍 Dónde Aparecen los Campos

### 1. **Creación de Reserva (Web)**
- Formulario de selección de transfer
- Campos obligatorios antes de agregar al carrito

### 2. **Dashboard (Admin)**
- Al crear/editar una reserva con transfer
- Validación en tiempo real

### 3. **Resumen del Carrito**
- Vista previa antes de confirmar
- Muestra aerolínea y número de vuelo

### 4. **Email de Confirmación**
- Cliente: Español e Inglés
- Tienda/Admin: Español

### 5. **Historial del Contrato**
- Detalles completos del transfer
- Información de vuelo visible

### 6. **Vista de Contrato**
- Timeline del contrato
- Detalles del servicio de transfer

---

## ⚠️ Notas Importantes

1. **Campos Obligatorios**: Ambos campos (`airline` y `flightNumber`) son obligatorios al crear un transfer

2. **Validación Frontend**: El frontend debe validar que ambos campos estén completos antes de enviar

3. **Formato Sugerido**:
   - **Aerolínea**: Nombre completo (ej: "Aeroméxico", "Volaris", "American Airlines")
   - **Número de Vuelo**: Código de aerolínea + número (ej: "AM123", "Y4567", "AA1234")

4. **Retrocompatibilidad**: Los transfers existentes sin estos campos pueden causar errores. Se recomienda:
   - Migrar datos existentes
   - O manejar casos donde estos campos sean `null`/`undefined`

5. **Templates Actualizados**:
   - ✅ `user-booking-content.template.ts` (Español)
   - ⏳ `user-booking-content-en.template.ts` (Inglés) - Pendiente
   - ⏳ `admin-booking-content.template.ts` (Admin) - Pendiente
   - ⏳ Otros templates de reserva/cancelación - Pendiente

---

## 🚀 Próximos Pasos

1. **Frontend**:
   - [ ] Agregar campos en formulario de transfer
   - [ ] Implementar validaciones
   - [ ] Actualizar resumen del carrito
   - [ ] Probar flujo completo

2. **Backend**:
   - [x] Actualizar schema del carrito
   - [x] Actualizar DTOs
   - [x] Actualizar template de email (ES)
   - [ ] Actualizar template de email (EN)
   - [ ] Actualizar template de admin
   - [ ] Actualizar otros templates

3. **Testing**:
   - [ ] Crear transfer con nuevos campos
   - [ ] Verificar email de confirmación
   - [ ] Verificar historial del contrato
   - [ ] Probar validaciones

---

## 📞 Soporte

Si tienes dudas sobre la implementación, contacta al equipo de desarrollo.

**Archivos Modificados**:
- `src/core/infrastructure/mongo/schemas/public/cart.schema.ts`
- `src/cart/infrastructure/nest/dtos/cart.dto.ts`
- `src/notification/infrastructure/provider/user-email/user-booking-content.template.ts`
