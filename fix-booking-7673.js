/**
 * Script para corregir la reserva #7673
 * 
 * Problema: Se registró totalPaid = 2793 cuando solo se pagó el 20% (558.60 MXN)
 * Solución: Actualizar totalPaid a 558.60 MXN
 * 
 * IMPORTANTE: Ejecutar este script en la consola de MongoDB o usando Node.js
 */

// ============================================
// OPCIÓN 1: MongoDB Shell / Compass
// ============================================

// Copiar y pegar en MongoDB Shell o Compass:

// 1. Verificar el estado actual de la reserva
db.bookings.findOne({ bookingNumber: 7673 }, { 
  bookingNumber: 1, 
  total: 1, 
  totalPaid: 1, 
  status: 1 
});

// 2. Actualizar el totalPaid al 20% del total (558.60 MXN)
db.bookings.updateOne(
  { bookingNumber: 7673 },
  { 
    $set: { 
      totalPaid: 558.60,
      updatedAt: new Date()
    } 
  }
);

// 3. Verificar que se actualizó correctamente
db.bookings.findOne({ bookingNumber: 7673 }, { 
  bookingNumber: 1, 
  total: 1, 
  totalPaid: 1, 
  status: 1 
});

// Resultado esperado:
// {
//   bookingNumber: 7673,
//   total: 2793,
//   totalPaid: 558.60,  // ✅ Actualizado
//   status: ObjectId("...") // APROBADO
// }


// ============================================
// OPCIÓN 2: Script Node.js
// ============================================

/*
const mongoose = require('mongoose');

async function fixBooking7673() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    
    console.log('Conectado a MongoDB');
    
    // Obtener el modelo de Booking
    const Booking = mongoose.model('Booking');
    
    // Buscar la reserva
    const booking = await Booking.findOne({ bookingNumber: 7673 });
    
    if (!booking) {
      console.error('❌ Reserva #7673 no encontrada');
      return;
    }
    
    console.log('📋 Estado actual:');
    console.log(`   Total: ${booking.total} MXN`);
    console.log(`   Total Pagado: ${booking.totalPaid} MXN`);
    console.log(`   Estado: ${booking.status}`);
    
    // Calcular el 20% del total
    const partialPayment = Math.round(booking.total * 0.20 * 100) / 100;
    
    console.log(`\n💰 Actualizando totalPaid a ${partialPayment} MXN (20% de ${booking.total} MXN)...`);
    
    // Actualizar el totalPaid
    booking.totalPaid = partialPayment;
    booking.updatedAt = new Date();
    await booking.save();
    
    console.log('✅ Reserva actualizada exitosamente');
    
    // Verificar la actualización
    const updatedBooking = await Booking.findOne({ bookingNumber: 7673 });
    console.log('\n📋 Estado actualizado:');
    console.log(`   Total: ${updatedBooking.total} MXN`);
    console.log(`   Total Pagado: ${updatedBooking.totalPaid} MXN`);
    console.log(`   Saldo Pendiente: ${updatedBooking.total - updatedBooking.totalPaid} MXN`);
    
    await mongoose.disconnect();
    console.log('\n✅ Script completado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el script
fixBooking7673();
*/


// ============================================
// OPCIÓN 3: Endpoint API (Recomendado)
// ============================================

/*
Crear un endpoint temporal en el backend para corregir la reserva:

PUT /booking/:id/fix-partial-payment

Body:
{
  "paidAmount": 558.60
}

Código del endpoint:

@Put(':id/fix-partial-payment')
@HttpCode(200)
@Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
@UseGuards(AuthGuards, RoleGuard)
async fixPartialPayment(
  @Param('id') id: string,
  @Body() body: { paidAmount: number }
) {
  const booking = await this.bookingService.findById(id);
  
  if (!booking) {
    throw new BaseErrorException('Booking not found', HttpStatus.NOT_FOUND);
  }
  
  const bookingData = booking.toJSON();
  
  console.log(`Corrigiendo reserva #${bookingData.bookingNumber}`);
  console.log(`Total: ${bookingData.total} MXN`);
  console.log(`Total Pagado Actual: ${bookingData.totalPaid} MXN`);
  console.log(`Nuevo Total Pagado: ${body.paidAmount} MXN`);
  
  // Actualizar el totalPaid
  await this.bookingService.update(id, {
    totalPaid: body.paidAmount
  });
  
  return {
    message: 'Reserva corregida exitosamente',
    bookingNumber: bookingData.bookingNumber,
    total: bookingData.total,
    previousTotalPaid: bookingData.totalPaid,
    newTotalPaid: body.paidAmount,
    pendingAmount: bookingData.total - body.paidAmount
  };
}

Luego llamar desde Postman o curl:

curl -X PUT http://localhost:3000/booking/[ID_DE_LA_RESERVA]/fix-partial-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paidAmount": 558.60}'
*/


// ============================================
// INFORMACIÓN ADICIONAL
// ============================================

/*
Reserva #7673:
- Cliente: Ivan Filimonov (counter92@inbox.ru)
- Total: 2793.00 MXN
- Pago realizado: 20% = 558.60 MXN
- Saldo pendiente: 2234.40 MXN
- Método de pago: Efectivo
- Estado: APROBADO

Después de ejecutar este script, la reserva debería mostrar:
- Total Pagado: 558.60 MXN
- Saldo Pendiente: 2234.40 MXN
*/
