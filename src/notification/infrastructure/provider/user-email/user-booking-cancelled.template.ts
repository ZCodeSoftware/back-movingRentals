import { BookingModel } from '../../../../booking/domain/models/booking.model';

// Interfaces para tipado (copiadas del archivo de confirmación)
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
  passengers?: number;
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
  airline?: string;
  flightNumber?: string;
  passengers?: number;
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
  passengers?: number;
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
  passengers?: number;
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

function getPassengerCount(passengers: any): number | undefined {
  if (!passengers) return undefined;
  if (typeof passengers === 'number') return passengers;
  if (typeof passengers === 'object') {
    // Si tiene adults y child, sumarlos
    if (passengers.adults !== undefined || passengers.child !== undefined) {
      const adults = passengers.adults || 0;
      const child = passengers.child || 0;
      return adults + child;
    }
    // Otros formatos de objeto
    if (passengers.count) return passengers.count;
    if (passengers.value) return passengers.value;
  }
  return undefined;
}

export function generateUserBookingCancellation(booking: BookingModel): {
  subject: string;
  html: string;
} {
  const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const cancellationDate =
    bookingData.cancellationDate ||
    bookingData.cancelledAt ||
    new Date().toISOString();
  const cancelledBy = bookingData.cancelledBy || '';
  const cancellationReason = bookingData.cancellationReason || '';

  let refundAmount =
    typeof bookingData.refundAmount === 'number' ? bookingData.refundAmount : 0;
  let totalReserva =
    typeof bookingData.total === 'number' ? bookingData.total : 0;
  let totalPagado =
    typeof bookingData.amountPaid === 'number'
      ? bookingData.amountPaid
      : typeof bookingData.totalPaid === 'number'
        ? bookingData.totalPaid
        : 0;
  let refundMethod = bookingData.refundMethod || '';
  let refundTimeframe = bookingData.refundTimeframe || '';
  let cancellationFee =
    typeof bookingData.cancellationFee === 'number'
      ? bookingData.cancellationFee
      : 0;

  // WhatsApp link config
  const whatsappNumber = bookingData.whatsappNumber || '+529841417024';
  const whatsappLink = bookingData.whatsappLink || `https://wa.me/529841417024`;

  // Parse del carrito usando la misma lógica que el email de confirmación
  const cartString = bookingData.cart;
  let cart: ParsedCart = {};
  let branchName = 'Sucursal no especificada';

  const errorSubject = `Reserva Cancelada - #${bookingNumber}`;
  const errorHtml = `
    <p>Hola,</p>
    <p>Tu reserva #${bookingNumber} ha sido cancelada exitosamente.</p>
    <p>Hemos encontrado un problema al mostrar los detalles completos de los items cancelados.</p>
    <p>Por favor, contáctanos directamente para cualquier consulta sobre tu cancelación.</p>
    <p>El equipo de MoovAdventures</p>`;

  if (cartString && typeof cartString === 'string') {
    try {
      cart = JSON.parse(cartString);
      branchName = cart.branch?.name || 'Sucursal no especificada';
    } catch (error) {
      console.error(
        `Error al parsear booking.cart para reserva #${bookingNumber}:`,
        error,
      );
      return { subject: errorSubject, html: errorHtml };
    }
  } else {
    console.error(
      `Error: booking.cart no es un string JSON válido para reserva #${bookingNumber}.`,
    );
    return { subject: errorSubject, html: errorHtml };
  }

  // Mapeo de items usando la misma estructura del email de confirmación
  const vehicles =
    cart.vehicles?.map((v: CartItemVehicle) => ({
      name: v.vehicle.name,
      category: v.vehicle.category.name,
      total: v.total,
      startDate: v.dates?.start,
      endDate: v.dates?.end,
      passengers: getPassengerCount(v.passengers),
    })) || [];

  const transfers =
    cart.transfer?.map((t: CartItemTransfer) => ({
      name: t.transfer.name,
      category: t.transfer.category.name,
      price: t.transfer.price,
      date: t.date,
      quantity: t.quantity,
      airline: t.airline,
      flightNumber: t.flightNumber,
      passengers: getPassengerCount(t.passengers),
    })) || [];

  const tours =
    cart.tours?.map((t: CartItemTour) => ({
      name: t.tour.name,
      category: t.tour.category.name,
      price: t.tour.price,
      date: t.date,
      quantity: t.quantity,
      passengers: getPassengerCount(t.passengers),
    })) || [];

  const tickets =
    cart.tickets?.map((ti: CartItemTicket) => ({
      name: ti.ticket.name,
      category: ti.ticket.category.name,
      price: ti.ticket.totalPrice,
      date: ti.date,
      quantity: ti.quantity,
      passengers: getPassengerCount(ti.passengers),
    })) || [];

  const subject = `Reserva Cancelada - #${bookingNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cancelación de Reserva - ${bookingNumber}</title>
<style>
body {
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
margin: 0;
padding: 0;
background-color: #f4f7f6;
color: #333333;
line-height: 1.6;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
}
.email-container {
max-width: 600px;
width: 100%;
margin: 20px auto;
padding: 25px;
background-color: #ffffff;
border-radius: 8px;
box-shadow: 0 0 20px rgba(0,0,0,0.05);
box-sizing: border-box;
}
h1, h2, h3 {
color: #2c3e50;
margin-top: 0;
font-weight: 600;
}
h1 {
font-size: 24px;
margin-bottom: 15px;
text-align: center;
color: #e74c3c;
}
h2 { font-size: 20px; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e0e6ed; }
h3 { font-size: 18px; color: #34495e; margin-top: 20px; margin-bottom: 8px; }
p, li { font-size: 16px; margin-bottom: 10px; }
strong { font-weight: 600; }
a { color: #3498db; text-decoration: none; font-weight: 500; }
a:hover { text-decoration: underline; }
.section { margin-bottom: 25px; }
.cancellation-alert {
background-color: #fdf2f2;
border: 1px solid #fecaca;
border-left: 4px solid #ef4444;
border-radius: 4px;
padding: 15px;
margin-bottom: 25px;
}
.cancellation-alert p {
color: #dc2626;
margin: 0;
font-weight: 500;
}
.item-details {
margin-bottom: 15px;
padding: 15px;
background-color: #f8f9fa;
border-left: 4px solid #95a5a6;
border-radius: 4px;
opacity: 0.8;
}
.item-details p { margin-bottom: 5px; }
.vehicle-item { border-left-color: #3498db; }
.transfer-item { border-left-color: #e67e22; }
.tour-item { border-left-color: #2ecc71; }
.ticket-item { border-left-color: #9b59b6; }
.refund-summary {
background-color: #f0f9ff;
border: 1px solid #bae6fd;
border-left: 4px solid #0ea5e9;
border-radius: 4px;
padding: 15px;
margin-bottom: 25px;
}
.refund-summary h3 {
color: #0369a1;
margin-top: 0;
margin-bottom: 10px;
}
.refund-summary p { margin-bottom: 6px; }
.payment-summary p, .contact-info p { margin-bottom: 6px; }
.footer { margin-top: 30px; padding-top: 20px; text-align: center; font-size: 14px; color: #7f8c8d; border-top: 1px solid #e0e6ed; }
.footer p { margin-bottom: 5px; }
.emoji { font-size: inherit; }
.important-info {
background-color: #fffbeb;
border: 1px solid #fde68a;
border-left: 4px solid #f59e0b;
border-radius: 4px;
padding: 15px;
margin-bottom: 25px;
}
.important-info h3 {
color: #92400e;
margin-top: 0;
margin-bottom: 10px;
}
@media screen and (max-width: 480px) {
.email-container { padding: 20px; margin: 10px auto; }
h1 { font-size: 22px; }
h2 { font-size: 18px; }
p, li { font-size: 15px; }
}
</style>
</head>
<body>
<div class="email-container">
<h1>Reserva Cancelada <span class="emoji">❌</span></h1>
<div class="cancellation-alert">
<p><span class="emoji">⚠</span> Tu reserva ha sido cancelada exitosamente.</p>
</div>
<p>Lamentamos que tu aventura en Tulum no se lleve a cabo según lo planeado. A continuación se muestran los detalles de tu reserva cancelada.</p>
<div class="section">
<h2>📝 Detalles de la Reserva Cancelada:</h2>
<p><strong>Número de reserva:</strong> ${bookingNumber}</p>
<p><strong>Fecha de cancelación:</strong> ${formatDate(cancellationDate)}</p>
${cancelledBy ? `<p><strong>Cancelado por:</strong> ${cancelledBy}</p>` : ''}
${cancellationReason ? `<p><strong>Motivo:</strong> ${cancellationReason}</p>` : ''}
${branchName !== 'Sucursal no especificada' ? `<p><strong>Sucursal original:</strong> ${branchName}</p>` : ''}
</div>
${
  vehicles.length > 0
    ? `
<div class="section">
<h3>🛵 Vehículo${vehicles.length > 1 ? 's' : ''} Cancelado${vehicles.length > 1 ? 's' : ''}:</h3>
${vehicles
  .map(
    (v) => `
<div class="item-details vehicle-item">
<p><strong>Nombre:</strong> ${v.name}</p>
<p><strong>Categoría:</strong> ${v.category}</p>
${v.startDate && v.endDate ? `<p><strong>Período original:</strong> ${formatDate(v.startDate)} - ${formatDate(v.endDate)}</p>` : ''}
${v.passengers ? `<p><strong>Pasajeros:</strong> ${v.passengers}</p>` : ''}
<p><strong>Subtotal:</strong> ${v.total.toFixed(2)} MXN</p>
</div>
`,
  )
  .join('')}
</div>`
    : ''
}
${
  transfers.length > 0
    ? `
<div class="section">
<h3>🚐 Transfer${transfers.length > 1 ? 's' : ''} Cancelado${transfers.length > 1 ? 's' : ''}:</h3>
${transfers
  .map(
    (t) => `
<div class="item-details transfer-item">
<p><strong>Servicio:</strong> ${t.name}</p>
<p><strong>Categoría:</strong> ${t.category}</p>
<p><strong>Fecha original:</strong> ${formatDate(t.date)}</p>
${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
${t.passengers ? `<p><strong>Pasajeros:</strong> ${t.passengers}</p>` : ''}
${t.airline ? `<p><strong>✈️ Aerolínea:</strong> ${t.airline}</p>` : ''}
${t.flightNumber ? `<p><strong>🎫 Número de vuelo:</strong> ${t.flightNumber}</p>` : ''}
<p><strong>Precio:</strong> ${t.price.toFixed(2)} MXN</p>
</div>
`,
  )
  .join('')}
</div>`
    : ''
}
${
  tours.length > 0
    ? `
<div class="section">
<h3>🗺️ Tour${tours.length > 1 ? 's' : ''} Cancelado${tours.length > 1 ? 's' : ''}:</h3>
${tours
  .map(
    (t) => `
<div class="item-details tour-item">
<p><strong>Nombre:</strong> ${t.name}</p>
<p><strong>Categoría:</strong> ${t.category}</p>
<p><strong>Fecha original:</strong> ${formatDate(t.date)}</p>
${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
${t.passengers ? `<p><strong>Pasajeros:</strong> ${t.passengers}</p>` : ''}
<p><strong>Precio:</strong> ${t.price.toFixed(2)} MXN</p>
</div>
`,
  )
  .join('')}
</div>`
    : ''
}
${
  tickets.length > 0
    ? `
<div class="section">
<h3>🎟️ Ticket${tickets.length > 1 ? 's' : ''} Cancelado${tickets.length > 1 ? 's' : ''}:</h3>
${tickets
  .map(
    (ti) => `
<div class="item-details ticket-item">
<p><strong>Nombre:</strong> ${ti.name}</p>
<p><strong>Categoría:</strong> ${ti.category}</p>
<p><strong>Fecha original:</strong> ${formatDate(ti.date)}</p>
${ti.quantity > 1 ? `<p><strong>Cantidad:</strong> ${ti.quantity}</p>` : ''}
${ti.passengers ? `<p><strong>Pasajeros:</strong> ${ti.passengers}</p>` : ''}
<p><strong>Precio:</strong> ${ti.price.toFixed(2)} MXN</p>
</div>
`,
  )
  .join('')}
</div>`
    : ''
}
${
  refundAmount > 0
    ? `
<div class="refund-summary">
<h3><span class="emoji">💰</span> Información de Reembolso:</h3>
<p><strong>Monto total de la reserva:</strong> $${totalReserva.toFixed(2)} MXN</p>
<p><strong>Monto pagado:</strong> $${totalPagado.toFixed(2)} MXN</p>
<p><strong>Monto a reembolsar:</strong> $${refundAmount.toFixed(2)} MXN</p>
${refundMethod ? `<p><strong>Método de reembolso:</strong> ${refundMethod}</p>` : ''}
${refundTimeframe ? `<p><strong>Tiempo de procesamiento:</strong> ${refundTimeframe}</p>` : ''}
</div>`
    : ''
}
${
  cancellationFee > 0
    ? `
<div class="important-info">
<h3><span class="emoji">💳</span> Tarifa de Cancelación Aplicada:</h3>
<p><strong>Tarifa de cancelación:</strong> $${cancellationFee.toFixed(2)} MXN</p>
<p><strong>Reembolso neto:</strong> $${(refundAmount - cancellationFee).toFixed(2)} MXN</p>
</div>`
    : ''
}
<div class="section payment-summary">
<h2>📊 Resumen de Cancelación:</h2>
<p><strong>Total original de la reserva:</strong> $${totalReserva.toFixed(2)} MXN</p>
<p><strong>Monto que se había pagado:</strong> $${totalPagado.toFixed(2)} MXN</p>
${cancellationFee > 0 ? `<p><strong>Tarifa de cancelación:</strong> -$${cancellationFee.toFixed(2)} MXN</p>` : ''}
<p><strong>Monto final de reembolso:</strong> $${(refundAmount - (cancellationFee || 0)).toFixed(2)} MXN</p>
</div>
<div class="section contact-info">
<h2><span class="emoji">📞</span> ¿Preguntas sobre tu cancelación?</h2>
<div class="item-details" style="background-color: #e3f2fd; border-left-color: #2196f3;">
<p><strong>📱 WhatsApp:</strong> <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">+52 984 141 7024</a></p>
<p><strong>📧 Email:</strong> <a href="mailto:oficinaveleta.moving@gmail.com">oficinaveleta.moving@gmail.com</a></p>
<p><strong>📍 Dirección:</strong> Calle 12 Sur Por avenida Guardianes Mayas, La Veleta, 77760 Tulum, Q.R.</p>
<p><strong>⏰ Horario:</strong> 9:00 AM - 7:00 PM</p>
</div>
<p style="margin-top: 15px;">Estamos aquí para ayudarte si necesitas alguna aclaración sobre esta cancelación o si te gustaría reservar nuevamente en el futuro.</p>
</div>
<div class="footer">
<p>¡Esperamos verte pronto! / We hope to see you again soon!</p>
<p><strong>El Equipo de MoovAdventures / The MoovAdventures Team</strong> <span class="emoji">🌴</span></p>
<p>Experiencias y Rentals en Tulum / Experiences and Rentals in Tulum</p>
</div>
</div>
</body>
</html>
`;

  return { subject, html };
}
