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

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'Fecha y hora no especificadas';
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return dateString;
  }
}

export function generateUserBookingReserve(
  booking: BookingModel,
  userEmail?: string,
  userData?: any
): { subject: string; html: string } {
  const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
  const cartString = bookingData.cart;

  let cart: ParsedCart = {};
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const totalReserva = bookingData.total || 0;
  const totalPagado = bookingData.totalPaid || 0;

  // Obtener información del usuario
  const customerName = userData?.name || bookingData.user?.name || 'Cliente';
  const customerLastName = userData?.lastName || bookingData.user?.lastName || '';
  const customerFullName = `${customerName} ${customerLastName}`.trim();

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

  const whatsappNumber = "+529841417024";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
  const phoneNumber = "+52 984 141 7024";
  const email = "info@moovadventures.com";

  const subject = `Reserva Pendiente #${bookingNumber}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f7f6;
          color: #333333;
          line-height: 1.6;
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
        p { font-size: 16px; margin-bottom: 10px; }
        strong { font-weight: 600; }
        a { color: #3498db; text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }
        .section { margin-bottom: 25px; }
        .item-details {
          margin-bottom: 15px;
          padding: 15px;
          background-color: #f8f9fa;
          border-left: 4px solid #3498db;
          border-radius: 4px;
        }
        .item-details p { margin-bottom: 5px; }
        .alert-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .alert-box p { margin: 5px 0; color: #856404; }
        .footer { 
          margin-top: 30px; 
          padding-top: 20px; 
          text-align: center; 
          font-size: 14px; 
          color: #7f8c8d; 
          border-top: 1px solid #e0e6ed; 
        }
        .footer p { margin-bottom: 5px; }
        @media screen and (max-width: 480px) {
          .email-container { padding: 20px; margin: 10px auto; }
          h1 { font-size: 22px; }
          h2 { font-size: 18px; }
          p { font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <h1 style="color: #f39c12;">Reserva Pendiente ⚠️</h1>
        <p>Hola <strong>${customerFullName}</strong>,</p>
        <p>Hemos recibido tu solicitud de reserva. A continuación encontrarás la información esencial:</p>

        <div class="alert-box">
          <p><strong>⚠️ RESERVA PENDIENTE:</strong> Tu reserva está pendiente de confirmación.</p>
          <p><strong>Contáctanos para confirmar y completar el pago.</strong></p>
        </div>

        <div class="section">
          <h2>📋 Resumen de Reserva</h2>
          <p><strong>Número de reserva:</strong> ${bookingNumber}</p>
          <p><strong>Cliente:</strong> ${customerFullName}</p>
          <p><strong>Estado:</strong> <span style="color: #f39c12; font-weight: bold;">PENDIENTE</span></p>
        </div>
        
        <div class="section">
          <h2>🛒 Items Solicitados</h2>
          ${vehicles.length > 0 ? `
            <p><strong>Vehículos:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${vehicles.map(v => {
                const startDate = v.startDate ? new Date(v.startDate) : null;
                const endDate = v.endDate ? new Date(v.endDate) : null;
                const days = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                return `<li>${v.name} - ${days > 0 ? `${days} día${days !== 1 ? 's' : ''}` : 'Fechas por confirmar'} - ${v.total.toFixed(2)} MXN</li>`;
              }).join('')}
            </ul>
          ` : ''}
          ${transfers.length > 0 ? `
            <p><strong>Transfers:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${transfers.map(t => `<li>${t.name} - ${formatDateTime(t.date)} - ${t.price.toFixed(2)} MXN</li>`).join('')}
            </ul>
          ` : ''}
          ${tours.length > 0 ? `
            <p><strong>Tours:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${tours.map(t => `<li>${t.name} - ${formatDateTime(t.date)} - ${t.price.toFixed(2)} MXN</li>`).join('')}
            </ul>
          ` : ''}
          ${tickets.length > 0 ? `
            <p><strong>Tickets:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${tickets.map(ti => `<li>${ti.name} - ${formatDateTime(ti.date)} - ${ti.price.toFixed(2)} MXN</li>`).join('')}
            </ul>
          ` : ''}
        </div>

        <div class="section">
          <h2>💰 Información de Pago</h2>
          <div class="item-details" style="background-color: #fff9e6; border-left-color: #f39c12;">
            <p><strong>Total de la reserva:</strong> <span style="font-size: 18px;">${totalReserva.toFixed(2)} MXN</span></p>
            <p><strong>Anticipo pagado (crédito/débito):</strong> ${totalPagado.toFixed(2)} MXN</p>
            <p><strong>Saldo pendiente:</strong> <span style="color: #e74c3c; font-size: 18px; font-weight: bold;">${(totalReserva - totalPagado).toFixed(2)} MXN</span></p>
            <p><strong>Método de pago:</strong> ${bookingData?.paymentMethod?.name || 'Por definir'}</p>
            ${bookingData?.metadata?.paymentMedium ? `<p><strong>Medio de pago:</strong> ${bookingData.metadata.paymentMedium}</p>` : ''}
          </div>
        </div>

        <div class="section">
          <h2>📞 Contáctanos para Confirmar tu Reserva</h2>
          <div class="item-details" style="background-color: #e8f5e9; border-left-color: #4caf50;">
            <p style="font-size: 16px; margin-bottom: 15px;"><strong>Para confirmar tu reserva y coordinar el pago del saldo pendiente, contáctanos por:</strong></p>
            <p><strong>📱 WhatsApp:</strong> <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="font-size: 16px;">${phoneNumber}</a></p>
            <p><strong>📧 Email:</strong> <a href="mailto:${email}" style="font-size: 16px;">${email}</a></p>
            <p><strong>📍 Dirección:</strong> Calle 12 Sur Por avenida Guardianes Mayas, La Veleta, 77760 Tulum, Q.R.</p>
            <p><strong>⏰ Horario:</strong> 9:00 AM - 7:00 PM</p>
          </div>
          <p style="margin-top: 15px; font-size: 14px; color: #666;">Una vez confirmado el pago, recibirás un email con todos los detalles completos de tu reserva.</p>
        </div>

        <div class="footer">
          <p>Gracias por elegir MoovAdventures!</p>
          <p><strong>El equipo de MoovAdventures</strong> 🌴</p>
          <p>Experiencias y Rentas en Tulum</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
