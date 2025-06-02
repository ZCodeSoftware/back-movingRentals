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


export function generateUserBookingConfirmation(
  booking: BookingModel
): { subject: string; html: string } {
  const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
  const cartString = bookingData.cart;

  let cart: ParsedCart = {};
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const totalReserva = bookingData.total || 0;
  const totalPagado = bookingData.totalPaid || 0;

  const errorSubject = `Problema con tu reserva #${bookingNumber} en MoovAdventures`;
  const errorHtml = `
    <p>Hola,</p>
    <p>Hemos encontrado un problema al intentar generar los detalles completos de tu reserva #${bookingNumber}.</p>
    <p>Por favor, contáctanos directamente para verificar el estado y los detalles de tu reserva.</p>
    <p>Disculpa las molestias.</p>
    <p>El equipo de MoovAdventures</p>`;

  if (!cartString || typeof cartString !== 'string') {
    console.error(`Error: booking.cart no es un string JSON válido para reserva #${bookingNumber}.`);
    return { subject: errorSubject, html: errorHtml };
  }

  try {
    cart = JSON.parse(cartString);
  } catch (error) {
    console.error(`Error al parsear booking.cart para reserva #${bookingNumber}:`, error);
    return { subject: errorSubject, html: errorHtml };
  }

  const branchName = cart.branch?.name || 'Sucursal no especificada';

  const vehicles = cart.vehicles?.map((v: CartItemVehicle) => ({
    name: v.vehicle.name,
    category: v.vehicle.category.name,
    total: v.total,
    startDate: v.dates?.start,
    endDate: v.dates?.end,
  })) || [];

  const transfers = cart.transfer?.map((t: CartItemTransfer) => ({
    name: t.transfer.name,
    category: t.transfer.category.name,
    price: t.transfer.price,
    date: t.date,
    quantity: t.quantity,
  })) || [];

  const tours = cart.tours?.map((t: CartItemTour) => ({
    name: t.tour.name,
    category: t.tour.category.name,
    price: t.tour.price,
    date: t.date,
    quantity: t.quantity,
  })) || [];

  const tickets = cart.tickets?.map((ti: CartItemTicket) => ({
    name: ti.ticket.name,
    category: ti.ticket.category.name,
    price: ti.ticket.totalPrice,
    date: ti.date,
    quantity: ti.quantity,
  })) || [];


  const saldoPendiente = totalReserva - totalPagado;

  const googleMapsUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14977.150869355888!2d-87.47104422988583!3d20.20536169601328!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f4fd7acf515282b%3A0xd05f4ca3b3ed71b6!2sM%C3%B6%C3%B6vAdventures%20-%20Rentals%20%26%20More%20%2F%20Atv%20rental%2C%20Atv%20tours%2C%20Scooter%20rental%20and%20Bikes*21!5e0!3m2!1ses!2sar!4v1744926430993!5m2!1ses!2sar`;
  const whatsappNumber = "+529841417024";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  const subject = `Tu reserva #${bookingNumber} en MoovAdventures está confirmada! 🚀`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
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
        h1 { font-size: 24px; margin-bottom: 15px; text-align: center; }
        h2 { font-size: 20px; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e0e6ed; }
        h3 { font-size: 18px; color: #34495e; margin-top: 20px; margin-bottom: 8px; }
        p, li { font-size: 16px; margin-bottom: 10px; }
        strong { font-weight: 600; }
        a { color: #3498db; text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }
        .section { margin-bottom: 25px; }
        .item-details {
          margin-bottom: 15px;
          padding: 15px;
          background-color: #f8f9fa;
          border-left: 4px solid #3498db; /* Color de acento principal */
          border-radius: 4px;
        }
        .item-details p { margin-bottom: 5px; }
        /* Colores de acento específicos para diferentes tipos de items (opcional) */
        .vehicle-item { border-left-color: #3498db; } /* Azul */
        .transfer-item { border-left-color: #e67e22; } /* Naranja */
        .tour-item { border-left-color: #2ecc71; } /* Verde */
        .ticket-item { border-left-color: #9b59b6; } /* Morado */

        .payment-summary p, .pickup-info p, .contact-info p { margin-bottom: 6px; }
        .footer { margin-top: 30px; padding-top: 20px; text-align: center; font-size: 14px; color: #7f8c8d; border-top: 1px solid #e0e6ed; }
        .footer p { margin-bottom: 5px; }
        .emoji { font-size: inherit; }

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
        <h1>Gracias por tu reserva! <span class="emoji">🎉</span></h1>
        <p>Estamos felices de acompañarte en tu próxima aventura por Tulum.</p>

        <div class="section">
          <h2>📝 Detalles generales de tu reserva:</h2>
          <p><strong>Número de reserva:</strong> ${bookingNumber}</p>
          ${branchName !== 'Sucursal no especificada' ? `<p><strong>Sucursal de referencia:</strong> ${branchName}</p>` : ''}
        </div>
        
        ${vehicles.length > 0 ? `
        <div class="section">
          <h3>🛵 Vehículo${vehicles.length > 1 ? 's' : ''} reservado${vehicles.length > 1 ? 's' : ''}:</h3>
          ${vehicles
        .map(
          (v) => `
                <div class="item-details vehicle-item">
                  <p><strong>Nombre:</strong> ${v.name}</p>
                  <p><strong>Categoría:</strong> ${v.category}</p>
                  ${v.startDate && v.endDate ? `<p><strong>Periodo:</strong> ${formatDate(v.startDate)} - ${formatDate(v.endDate)}</p>` : ''}
                  <p><strong>Subtotal:</strong> $${v.total.toFixed(2)} MXN</p>
                </div>
              `
        )
        .join('')}
        </div>` : ''}

        ${transfers.length > 0 ? `
        <div class="section">
          <h3>🚐 Transfer${transfers.length > 1 ? 's' : ''} reservado${transfers.length > 1 ? 's' : ''}:</h3>
          ${transfers
        .map(
          (t) => `
                <div class="item-details transfer-item">
                  <p><strong>Servicio:</strong> ${t.name}</p>
                  <p><strong>Categoría:</strong> ${t.category}</p>
                  <p><strong>Fecha:</strong> ${formatDate(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
                  <p><strong>Precio:</strong> $${t.price.toFixed(2)} MXN</p>
                </div>
              `
        )
        .join('')}
        </div>` : ''}

        ${tours.length > 0 ? `
        <div class="section">
          <h3>🗺️ Tour${tours.length > 1 ? 's' : ''} reservado${tours.length > 1 ? 's' : ''}:</h3>
          ${tours
        .map(
          (t) => `
                <div class="item-details tour-item">
                  <p><strong>Nombre:</strong> ${t.name}</p>
                  <p><strong>Categoría:</strong> ${t.category}</p>
                  <p><strong>Fecha:</strong> ${formatDate(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
                  <p><strong>Precio:</strong> $${t.price.toFixed(2)} MXN</p>
                </div>
              `
        )
        .join('')}
        </div>` : ''}

        ${tickets.length > 0 ? `
        <div class="section">
          <h3>🎟️ Ticket${tickets.length > 1 ? 's' : ''} reservado${tickets.length > 1 ? 's' : ''}:</h3>
          ${tickets
        .map(
          (ti) => `
                <div class="item-details ticket-item">
                  <p><strong>Nombre:</strong> ${ti.name}</p>
                  <p><strong>Categoría:</strong> ${ti.category}</p>
                  <p><strong>Fecha:</strong> ${formatDate(ti.date)}</p>
                  ${ti.quantity > 1 ? `<p><strong>Cantidad:</strong> ${ti.quantity}</p>` : ''}
                  <p><strong>Precio:</strong> $${ti.price.toFixed(2)} MXN</p>
                </div>
              `
        )
        .join('')}
        </div>` : ''}

        <div class="section payment-summary">
          <h2>💳 Resumen de pago:</h2>
          <p><strong>Total de la reserva:</strong> $${totalReserva.toFixed(2)} MXN</p>
          <p><strong>Total pagado:</strong> $${totalPagado.toFixed(2)} MXN</p>
          <p><strong>Saldo pendiente:</strong> $${saldoPendiente.toFixed(2)} MXN</p>
        </div>

        ${branchName !== 'Sucursal no especificada' ? `
        <div class="section pickup-info">
          <h2>📍 Información de retiro (Vehículos):</h2>
          <p>Para vehículos, el retiro es en Sucursal ${branchName} – <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer">Ver en Google Maps</a></p>
          <p><strong><span class="emoji">⏰</span> Horario de atención:</strong> 9:00 AM a 7:00 PM</p>
        </div>` : `
        <div class="section pickup-info">
          <h2>📍 Puntos de encuentro / Horarios:</h2>
          <p>Por favor, revisa los detalles específicos de cada tour, transfer o ticket para conocer los puntos de encuentro y horarios exactos.</p>
        </div>
        `}

        <div class="section contact-info">
          <h2><span class="emoji">📞</span> Dudas?</h2>
          <p>Contáctanos por WhatsApp: <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">${whatsappNumber}</a></p>
        </div>

        <div class="footer">
          <p>Nos vemos pronto!</p>
          <p><strong>El equipo de MoovAdventures</strong> <span class="emoji">🌴</span></p>
          <p>Experiencias y Rentas en Tulum</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}