import { BookingModel } from '../../../../booking/domain/models/booking.model';

// Interfaces para tipado (igual que en la versión en español)
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
  if (!dateString) return 'Date not specified';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
}

export function generateUserBookingCancellationEn(booking: BookingModel): {
  subject: string;
  html: string;
} {
  const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
  const bookingNumber = bookingData.bookingNumber || 'N/A';

  // Usar limitCancelation o la fecha actual como fecha de cancelación
  const cancellationDate = bookingData.limitCancelation
    ? bookingData.limitCancelation
    : bookingData.cancellationDate ||
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
  let branchName = 'Branch not specified';

  const errorSubject = `Booking Cancelled - #${bookingNumber}`;
  const errorHtml = `
    <p>Hello,</p>
    <p>Your booking #${bookingNumber} has been successfully cancelled.</p>
    <p>We found an issue displaying the complete details of the cancelled items.</p>
    <p>Please contact us directly for any questions about your cancellation.</p>
    <p>The MoovAdventures Team</p>`;

  if (cartString && typeof cartString === 'string') {
    try {
      cart = JSON.parse(cartString);
      branchName = cart.branch?.name || 'Branch not specified';
    } catch (error) {
      console.error(
        `Error parsing booking.cart for booking #${bookingNumber}:`,
        error,
      );
      return { subject: errorSubject, html: errorHtml };
    }
  } else {
    console.error(
      `Error: booking.cart is not a valid JSON string for booking #${bookingNumber}.`,
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

  const subject = `Booking Cancelled - #${bookingNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booking Cancellation - ${bookingNumber}</title>
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
<h1>Booking Cancelled <span class="emoji">❌</span></h1>
<div class="cancellation-alert">
<p><span class="emoji">⚠</span> Your booking has been successfully cancelled.</p>
</div>
<p>We're sorry to see that your adventure in Tulum won't be happening as planned. Below are the details of your cancelled booking.</p>
<div class="section">
<h2>📝 Cancelled Booking Details:</h2>
<p><strong>Booking number:</strong> ${bookingNumber}</p>
<p><strong>Cancellation date:</strong> ${formatDate(cancellationDate)}</p>
${cancelledBy ? `<p><strong>Cancelled by:</strong> ${cancelledBy}</p>` : ''}
${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
${branchName !== 'Branch not specified' ? `<p><strong>Original branch:</strong> ${branchName}</p>` : ''}
</div>
${
  vehicles.length > 0
    ? `
<div class="section">
<h3>🛵 Cancelled Vehicle${vehicles.length > 1 ? 's' : ''}:</h3>
${vehicles
  .map(
    (v) => `
<div class="item-details vehicle-item">
<p><strong>Name:</strong> ${v.name}</p>
<p><strong>Category:</strong> ${v.category}</p>
${v.startDate && v.endDate ? `<p><strong>Original Period:</strong> ${formatDate(v.startDate)} - ${formatDate(v.endDate)}</p>` : ''}
<p><strong>Subtotal:</strong> $${v.total.toFixed(2)} MXN</p>
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
<h3>🚐 Cancelled Transfer${transfers.length > 1 ? 's' : ''}:</h3>
${transfers
  .map(
    (t) => `
<div class="item-details transfer-item">
<p><strong>Service:</strong> ${t.name}</p>
<p><strong>Category:</strong> ${t.category}</p>
<p><strong>Original Date:</strong> ${formatDate(t.date)}</p>
${t.quantity > 1 ? `<p><strong>Quantity:</strong> ${t.quantity}</p>` : ''}
<p><strong>Price:</strong> $${t.price.toFixed(2)} MXN</p>
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
<h3>🗺️ Cancelled Tour${tours.length > 1 ? 's' : ''}:</h3>
${tours
  .map(
    (t) => `
<div class="item-details tour-item">
<p><strong>Name:</strong> ${t.name}</p>
<p><strong>Category:</strong> ${t.category}</p>
<p><strong>Original Date:</strong> ${formatDate(t.date)}</p>
${t.quantity > 1 ? `<p><strong>Quantity:</strong> ${t.quantity}</p>` : ''}
<p><strong>Price:</strong> $${t.price.toFixed(2)} MXN</p>
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
<h3>🎟️ Cancelled Ticket${tickets.length > 1 ? 's' : ''}:</h3>
${tickets
  .map(
    (ti) => `
<div class="item-details ticket-item">
<p><strong>Name:</strong> ${ti.name}</p>
<p><strong>Category:</strong> ${ti.category}</p>
<p><strong>Original Date:</strong> ${formatDate(ti.date)}</p>
${ti.quantity > 1 ? `<p><strong>Quantity:</strong> ${ti.quantity}</p>` : ''}
<p><strong>Price:</strong> $${ti.price.toFixed(2)} MXN</p>
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
<h3><span class="emoji">💰</span> Refund Information:</h3>
<p><strong>Total booking amount:</strong> $${totalReserva.toFixed(2)} MXN</p>
<p><strong>Amount paid:</strong> $${totalPagado.toFixed(2)} MXN</p>
<p><strong>Amount to refund:</strong> $${refundAmount.toFixed(2)} MXN</p>
${refundMethod ? `<p><strong>Refund method:</strong> ${refundMethod}</p>` : ''}
${refundTimeframe ? `<p><strong>Processing time:</strong> ${refundTimeframe}</p>` : ''}
</div>`
    : ''
}
${
  cancellationFee > 0
    ? `
<div class="important-info">
<h3><span class="emoji">💳</span> Cancellation Fee Applied:</h3>
<p><strong>Cancellation fee:</strong> $${cancellationFee.toFixed(2)} MXN</p>
<p><strong>Net refund:</strong> $${(refundAmount - cancellationFee).toFixed(2)} MXN</p>
</div>`
    : ''
}
<div class="section payment-summary">
<h2>📊 Cancellation Summary:</h2>
<p><strong>Original booking total:</strong> $${totalReserva.toFixed(2)} MXN</p>
<p><strong>Amount that was paid:</strong> $${totalPagado.toFixed(2)} MXN</p>
${cancellationFee > 0 ? `<p><strong>Cancellation fee:</strong> -$${cancellationFee.toFixed(2)} MXN</p>` : ''}
<p><strong>Final refund amount:</strong> $${(refundAmount - (cancellationFee || 0)).toFixed(2)} MXN</p>
</div>
<div class="important-info">
<h3><span class="emoji">📋</span> What happens next?</h3>
<p>• If applicable, your refund will be processed according to our cancellation policy</p>
<p>• You will receive a confirmation once the refund has been initiated</p>
<p>• Any physical items (like equipment) should be returned if already collected</p>
<p>• Please save this email as your cancellation confirmation</p>
</div>
<div class="section contact-info">
<h2><span class="emoji">📞</span> Questions about your cancellation?</h2>
<p>Contact us via WhatsApp: <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">${whatsappNumber}</a></p>
<p>We're here to help if you need any clarification about this cancellation or if you'd like to book again in the future.</p>
</div>
<div class="footer">
<p>We hope to see you again soon!</p>
<p><strong>The MoovAdventures Team</strong> <span class="emoji">🌴</span></p>
<p>Experiences and Rentals in Tulum</p>
</div>
</div>
</body>
</html>
`;

  return { subject, html };
}
