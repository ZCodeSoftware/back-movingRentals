import { BookingModel } from '../../../../booking/domain/models/booking.model';

interface CartCategory {
  name: string;
}

interface CartVehicleDetail {
  _id: string;
  name: string;
  price: number;
  category: CartCategory;
}

interface CartItemVehicle {
  vehicle: CartVehicleDetail;
  total: number;
  dates?: { start: string; end: string };
}

interface CartTransferDetail {
  _id: string;
  name: string;
  price: number;
  category: CartCategory;
}
interface CartItemTransfer {
  transfer: CartTransferDetail;
  date: string;
  quantity: number;
}

interface CartTourDetail {
  _id: string;
  name: string;
  price: number;
  category: CartCategory;
}
interface CartItemTour {
  tour: CartTourDetail;
  date: string;
  quantity: number;
}

interface CartTicketDetail {
  _id: string;
  name: string;
  totalPrice: number;
  category: CartCategory;
}
interface CartItemTicket {
  ticket: CartTicketDetail;
  date: string;
  quantity: number;
}

interface ParsedCart {
  branch?: { name: string };
  vehicles?: CartItemVehicle[];
  transfer?: CartItemTransfer[];
  tours?: CartItemTour[];
  tickets?: CartItemTicket[];
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Fecha no especificada';
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Genera el correo de notificación para el administrador con un formato completo y robusto.
 * @param booking El objeto de la reserva.
 * @returns Un objeto con el 'subject' y el 'html' del correo.
 */
export function generateAdminBookingNotification(booking: BookingModel): {
  subject: string;
  html: string;
} {
  const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
  const cartString = bookingData.cart;

  let cart: ParsedCart = {};
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const totalReserva = bookingData.total || 0;
  const totalPagado = bookingData.totalPaid || 0;

  const customerName = bookingData.user?.name || 'No especificado';
  const customerEmail = bookingData.user?.email || 'No especificado';
  const customerPhone = bookingData.user?.phone || 'No especificado';

  const errorSubject = `[ACCIÓN REQUERIDA] Problema al procesar Reserva #${bookingNumber}`;
  const errorHtml = `
    <p><strong>Atención:</strong></p>
    <p>No se pudo generar el detalle completo para la reserva #${bookingNumber}.</p>
    <p>El campo 'cart' podría estar malformado o vacío.</p>
    <p>Por favor, revisa la reserva directamente en el panel de administración.</p>
    <p><strong>Cliente:</strong> ${customerName} (${customerEmail})</p>`;

  if (!cartString || typeof cartString !== 'string') {
    console.error(
      `Error: booking.cart no es un string JSON válido para reserva #${bookingNumber}.`,
    );
    return { subject: errorSubject, html: errorHtml };
  }

  try {
    cart = JSON.parse(cartString);
  } catch (error) {
    console.error(
      `Error al parsear booking.cart para reserva #${bookingNumber}:`,
      error,
    );
    return { subject: errorSubject, html: errorHtml };
  }

  const branchName = cart.branch?.name || 'Sucursal no especificada';

  const vehicles =
    cart.vehicles?.map((v: CartItemVehicle) => ({
      name: v.vehicle.name,
      category: v.vehicle.category.name,
      total: v.total,
      startDate: v.dates?.start,
      endDate: v.dates?.end,
    })) || [];

  const transfers =
    cart.transfer?.map((t: CartItemTransfer) => ({
      name: t.transfer.name,
      category: t.transfer.category.name,
      price: t.transfer.price,
      date: t.date,
      quantity: t.quantity,
    })) || [];

  const tours =
    cart.tours?.map((t: CartItemTour) => ({
      name: t.tour.name,
      category: t.tour.category.name,
      price: t.tour.price,
      date: t.date,
      quantity: t.quantity,
    })) || [];

  const tickets =
    cart.tickets?.map((ti: CartItemTicket) => ({
      name: ti.ticket.name,
      category: ti.ticket.category.name,
      price: ti.ticket.totalPrice,
      date: ti.date,
      quantity: ti.quantity,
    })) || [];

  const saldoPendiente = totalReserva - totalPagado;

  const subject = `Nueva Reserva #${bookingNumber}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        /* Estilos copiados del correo del cliente para consistencia visual */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; color: #333; }
        .email-container { max-width: 600px; margin: 20px auto; padding: 25px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.05); }
        h1, h2, h3 { color: #2c3e50; margin-top: 0; font-weight: 600; }
        h1 { font-size: 24px; text-align: center; }
        h2 { font-size: 20px; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e0e6ed; }
        p { font-size: 16px; line-height: 1.6; margin-bottom: 10px; }
        strong { font-weight: 600; }
        .section { margin-bottom: 25px; }
        .item-details { margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px; }
        .item-details p { margin-bottom: 5px; }
        /* Colores para distinguir items */
        .customer-details { border-left-color: #1abc9c; } /* Verde menta */
        .vehicle-item { border-left-color: #3498db; } /* Azul */
        .transfer-item { border-left-color: #e67e22; } /* Naranja */
        .tour-item { border-left-color: #2ecc71; } /* Verde */
        .ticket-item { border-left-color: #9b59b6; } /* Morado */
        .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <h1>¡Nueva Reserva Recibida! 🛎️</h1>        

        <div class="section">
          <h2>📝 Detalles de la Reserva:</h2>
          <p><strong>Número de reserva:</strong> ${bookingNumber}</p>
          ${branchName !== 'Sucursal no especificada' ? `<p><strong>Sucursal de referencia:</strong> ${branchName}</p>` : ''}
        </div>
        
        ${
          vehicles.length > 0
            ? `
        <div class="section">
          <h3>🛵 Vehículo(s):</h3>
          ${vehicles
            .map(
              (v) => `
                <div class="item-details vehicle-item">
                  <p><strong>Nombre:</strong> ${v.name} (${v.category})</p>
                  ${v.startDate && v.endDate ? `<p><strong>Periodo:</strong> ${formatDate(v.startDate)} - ${formatDate(v.endDate)}</p>` : ''}
                  <p><strong>Subtotal:</strong> $${v.total.toFixed(2)} MXN</p>
                </div>`,
            )
            .join('')}
        </div>`
            : ''
        }

        ${
          transfers.length > 0
            ? `
        <div class="section">
          <h3>🚐 Transfer(s):</h3>
          ${transfers
            .map(
              (t) => `
                <div class="item-details transfer-item">
                  <p><strong>Servicio:</strong> ${t.name} (${t.category})</p>
                  <p><strong>Fecha:</strong> ${formatDate(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
                  <p><strong>Precio:</strong> $${t.price.toFixed(2)} MXN</p>
                </div>`,
            )
            .join('')}
        </div>`
            : ''
        }

        ${
          tours.length > 0
            ? `
        <div class="section">
          <h3>🗺️ Tour(s):</h3>
          ${tours
            .map(
              (t) => `
                <div class="item-details tour-item">
                  <p><strong>Nombre:</strong> ${t.name} (${t.category})</p>
                  <p><strong>Fecha:</strong> ${formatDate(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
                  <p><strong>Precio:</strong> $${t.price.toFixed(2)} MXN</p>
                </div>`,
            )
            .join('')}
        </div>`
            : ''
        }
        
        ${
          tickets.length > 0
            ? `
        <div class="section">
          <h3>🎟️ Ticket(s):</h3>
          ${tickets
            .map(
              (ti) => `
                <div class="item-details ticket-item">
                  <p><strong>Nombre:</strong> ${ti.name} (${ti.category})</p>
                  <p><strong>Fecha:</strong> ${formatDate(ti.date)}</p>
                  ${ti.quantity > 1 ? `<p><strong>Cantidad:</strong> ${ti.quantity}</p>` : ''}
                  <p><strong>Precio:</strong> $${ti.price.toFixed(2)} MXN</p>
                </div>`,
            )
            .join('')}
        </div>`
            : ''
        }

        <div class="section">
          <h2>💳 Resumen de Pago:</h2>
          <p><strong>Total de la reserva:</strong> ${totalReserva.toFixed(2)} MXN</p>
          <p><strong>Total pagado:</strong> ${totalPagado.toFixed(2)} MXN</p>
          <p><strong>Saldo pendiente:</strong> ${saldoPendiente.toFixed(2)} MXN</p>
          <p><strong>Método de pago:</strong> ${bookingData?.paymentMethod?.name || 'No especificado'}</p>
          <p><strong>Medio de pago (administrativo):</strong> ${bookingData?.metadata?.paymentMedium || bookingData?.paymentMedium || 'No especificado'}</p>
          ${bookingData?.metadata?.depositNote ? `<p><strong>Nota de depósito:</strong> ${bookingData.metadata.depositNote}</p>` : ''}
        </div>

        <div class="footer">
          <p>Este es un correo de notificación automático.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
