# ✅ Implementación Completa - Sistema de Registro de Pagos

## 🎯 Estado Actual

El backend ya está preparado para recibir el objeto `payments` desde el frontend del Dashboard.

### Cambios Realizados:

1. ✅ **Controller** (`booking.controller.ts`): Acepta `payments` en el body
2. ✅ **Interface** (`booking.interface.service.ts`): Agregado parámetro opcional `payments`
3. ⏳ **Service** (`booking.service.ts`): Pendiente agregar lógica de registro

---

## 📤 Lo que el Frontend DEBE Enviar

### 🌐 Desde WEB (NO cambiar):
```http
PUT /api/v1/booking/validate/:bookingId?paid=true&lang=es
Content-Type: application/json

{}
```

### 🖥️ Desde DASHBOARD (NUEVO):
```http
PUT /api/v1/booking/validate/:bookingId?paid=true&lang=es
Content-Type: application/json

{
  "payments": {
    "initial": {
      "amount": 10,
      "percentage": 20,
      "paymentMethod": "Credito/Debito",
      "paymentMedium": "CUENTA",
      "paidAt": "2024-11-26T10:00:00.000Z",
      "status": "PAID"
    },
    "final": {
      "amount": 40,
      "percentage": 80,
      "paymentMethod": "Efectivo",
      "paymentMedium": "$",
      "status": "PENDING"
    }
  }
}
```

---

## 🔧 Lógica del Backend (a implementar en booking.service.ts)

En el método `validateBooking`, después de actualizar el status del contrato, agregar:

```typescript
// Registrar información de pagos en metadata si el pago fue aprobado
if (statusName === TypeStatus.APPROVED && paid) {
  try {
    const bookingData = updatedBooking.toJSON();
    const total = bookingData.total || 0;
    const totalPaid = bookingData.totalPaid || 0;
    const isDeposit = bookingData.isReserve || totalPaid < total;
    
    let paymentsData: any = {};
    
    // Si viene el objeto payments desde el Dashboard, usarlo directamente
    if (payments && (payments.initial || payments.final)) {
      console.log('[BookingService] Usando datos de pagos enviados desde Dashboard');
      paymentsData = payments;
    } 
    // Si NO viene payments, generar automáticamente (Web)
    else if (contractSource === 'Web') {
      console.log('[BookingService] Generando datos de pagos automáticamente para Web');
      
      if (isDeposit) {
        // Pago inicial (20% o el monto pagado)
        paymentsData.initial = {
          amount: totalPaid,
          percentage: Math.round((totalPaid / total) * 100),
          paymentMethod: paymentMethodName,
          paymentMedium: 'CUENTA',
          paidAt: new Date().toISOString(),
          status: 'PAID',
          source: 'Web'
        };
        
        // Pago final (80% o el resto)
        const remainingAmount = total - totalPaid;
        paymentsData.final = {
          amount: remainingAmount,
          percentage: Math.round((remainingAmount / total) * 100),
          paymentMethod: 'Efectivo',
          paymentMedium: '$',
          status: 'PENDING',
          source: 'Web'
        };
      } else {
        // Pago completo (100%)
        paymentsData.initial = {
          amount: total,
          percentage: 100,
          paymentMethod: paymentMethodName,
          paymentMedium: 'CUENTA',
          paidAt: new Date().toISOString(),
          status: 'PAID',
          source: 'Web'
        };
      }
    }
    
    // Guardar en metadata si hay datos de pagos
    if (paymentsData.initial || paymentsData.final) {
      await this.bookingRepository['bookingDB'].updateOne(
        { _id: id },
        { 
          $set: { 
            'metadata.payments': paymentsData
          } 
        }
      );
      console.log('[BookingService] Información de pagos registrada en metadata:', JSON.stringify(paymentsData, null, 2));
    }
  } catch (error) {
    console.error('[BookingService] Error registrando información de pagos:', error);
    // No fallar la validación si falla el registro de pagos
  }
}
```

---

## 📋 Ubicación Exacta en booking.service.ts

Insertar el código anterior en la línea **~920** (aproximadamente), justo después de:

```typescript
// Actualizar el status del contrato asociado para mantener consistencia
try {
  const Contract = this.bookingRepository['bookingDB'].db.model('Contract');
  const contract = await Contract.findOne({ booking: id });
  if (contract) {
    contract.status = status.toJSON()._id;
    await contract.save();
    console.log(`[BookingService] Status del contrato ${contract._id} actualizado a ${statusName}`);
  }
} catch (error) {
  console.error('[BookingService] Error actualizando status del contrato:', error.message);
}

// ← INSERTAR AQUÍ EL CÓDIGO DE REGISTRO DE PAGOS

// Enviar correo según el estado resultante
console.log(`[BookingService] validateBooking - Status final: ${statusName}, Paid: ${paid}`);
```

---

## ✅ Resultado Final

Después de validar un booking, el objeto tendrá en su metadata:

```javascript
{
  "_id": "6928ad8784e211ccebd4c879",
  "bookingNumber": 7508,
  "total": 50,
  "totalPaid": 10,
  "metadata": {
    "payments": {
      "initial": {
        "amount": 10,
        "percentage": 20,
        "paymentMethod": "Credito/Debito",
        "paymentMedium": "CUENTA",
        "paidAt": "2024-11-26T10:00:00.000Z",
        "status": "PAID",
        "source": "Web"
      },
      "final": {
        "amount": 40,
        "percentage": 80,
        "paymentMethod": "Efectivo",
        "paymentMedium": "$",
        "status": "PENDING",
        "source": "Web"
      }
    }
  }
}
```

---

## 🎨 Interfaz del Dashboard (Sugerencia)

Ver archivo `FRONTEND_PAGOS_SPEC.md` para ejemplos completos de código React y diseño de interfaz.

---

## 📝 Notas Importantes

1. El parámetro `payments` es **opcional** - si no viene, el backend genera los datos automáticamente para Web
2. Para Dashboard, el frontend **DEBE** enviar el objeto `payments` completo
3. Los datos se guardan en `booking.metadata.payments`
4. El registro de pagos solo ocurre cuando el status es **APPROVED** y `paid=true`
5. Si falla el registro de pagos, NO falla la validación del booking (error silencioso con log)

---

## 🚀 Próximos Pasos

1. Implementar el código en `booking.service.ts` (línea ~920)
2. Probar desde Web (debe funcionar automáticamente)
3. Implementar interfaz en Dashboard para enviar `payments`
4. Probar desde Dashboard con datos manuales
5. Verificar que los datos se guarden correctamente en `metadata.payments`
