import { BookingModel } from '../../../../booking/domain/models/booking.model';

export function generateAdminBookingCancellation(
  booking: BookingModel,
  userData?: any,
): string {
  const bookingData = booking.toJSON();
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const total = bookingData.total || 0;
  const createdAt = bookingData.createdAt
    ? new Date(bookingData.createdAt).toLocaleDateString('es-ES')
    : 'N/A';
  const cancelledAt = new Date().toLocaleDateString('es-ES');

  const customerName = userData?.name || 'No especificado';
  const customerEmail = userData?.email || 'No especificado';
  const customerPhone =
    userData?.phone || userData?.cellphone || 'No especificado';

  let cartDetails = '';
  try {
    const cart = JSON.parse(bookingData.cart || '{}');

    // Procesar vehículos
    if (cart.vehicles && cart.vehicles.length > 0) {
      cartDetails += '<h4>🚗 Vehículos:</h4><ul>';
      cart.vehicles.forEach((item: any) => {
        cartDetails += `<li>${item.vehicle?.name || 'Vehículo'} - $${item.total || 0}</li>`;
      });
      cartDetails += '</ul>';
    }

    // Procesar transfers
    if (cart.transfer && cart.transfer.length > 0) {
      cartDetails += '<h4>🚐 Transfers:</h4><ul>';
      cart.transfer.forEach((item: any) => {
        cartDetails += `<li>${item.transfer?.name || 'Transfer'} - Cantidad: ${item.quantity || 1} - $${(item.transfer?.price || 0) * (item.quantity || 1)}</li>`;
      });
      cartDetails += '</ul>';
    }

    // Procesar tours
    if (cart.tours && cart.tours.length > 0) {
      cartDetails += '<h4>🗺️ Tours:</h4><ul>';
      cart.tours.forEach((item: any) => {
        cartDetails += `<li>${item.tour?.name || 'Tour'} - Cantidad: ${item.quantity || 1} - $${(item.tour?.price || 0) * (item.quantity || 1)}</li>`;
      });
      cartDetails += '</ul>';
    }

    // Procesar tickets
    if (cart.tickets && cart.tickets.length > 0) {
      cartDetails += '<h4>🎫 Tickets:</h4><ul>';
      cart.tickets.forEach((item: any) => {
        cartDetails += `<li>${item.ticket?.name || 'Ticket'} - Cantidad: ${item.quantity || 1} - $${(item.ticket?.totalPrice || 0) * (item.quantity || 1)}</li>`;
      });
      cartDetails += '</ul>';
    }
  } catch (error) {
    cartDetails = '<p>Detalles del carrito no disponibles</p>';
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Cancelada - Notificación Admin</title>
        <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; color: #333; }
        .email-container { max-width: 600px; margin: 20px auto; padding: 25px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.05); }
        h1, h2, h3 { color: #e74c3c; margin-top: 0; font-weight: 600; }
        h1 { font-size: 28px; text-align: center; margin-bottom: 30px; }
        .alert-box { background-color: #fff5f5; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center; }
        .booking-info { background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
        .customer-info { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
        .booking-details { background-color: #fef7f0; border: 1px solid #fed7aa; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
        .total { font-size: 18px; font-weight: bold; color: #e74c3c; text-align: center; margin: 20px 0; padding: 15px; background-color: #fff5f5; border-radius: 6px; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin-bottom: 5px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
      <div class="email-container">
        <h1>🚨 Reserva Cancelada</h1>
        
        <div class="alert-box">
          <h2>¡Atención! Una reserva ha sido cancelada</h2>
          <p><strong>Número de Reserva:</strong> #${bookingNumber}</p>
          <p><strong>Fecha de Cancelación:</strong> ${cancelledAt}</p>
        </div>

        <div class="booking-info">
          <h3>📋 Información de la Reserva</h3>
          <p><strong>Número de Reserva:</strong> #${bookingNumber}</p>
          <p><strong>Fecha de Creación:</strong> ${createdAt}</p>
          <p><strong>Estado Actual:</strong> CANCELADA</p>
          <p><strong>Total:</strong> $${total.toLocaleString('es-ES')}</p>
        </div>
     
        <div class="booking-details">
          <h3>🛍️ Detalles de la Reserva Cancelada</h3>
          ${cartDetails}
        </div>

        <div class="total">
          Total de la Reserva Cancelada: $${total.toLocaleString('es-ES')}
        </div>

        <div class="footer">
          <p><strong>Acción Requerida:</strong> Revisar la cancelación y procesar cualquier reembolso necesario.</p>
          <p>Por favor, revisa la reserva cancelada directamente en el panel de administración.</p>
          <p>Sistema de Notificaciones - MoovAdventures</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
