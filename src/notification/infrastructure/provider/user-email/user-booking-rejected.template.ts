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

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'Fecha y hora no especificadas';
  try {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Cancun',
    });
    const timeStr = date.toLocaleTimeString('es-ES', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Cancun',
    });
    return `${dateStr}, ${timeStr}`;
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

export function generateUserBookingRejected(
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

  const vehicles = cart.vehicles?.map((v: CartItemVehicle) => {
    const isPopulated = v.vehicle && typeof v.vehicle === 'object' && v.vehicle.name;
    return {
      name: isPopulated ? v.vehicle.name : 'Vehículo',
      category: isPopulated && v.vehicle.category?.name ? v.vehicle.category.name : 'Sin categoría',
      total: v.total || 0,
      startDate: v.dates?.start,
      endDate: v.dates?.end,
      passengers: getPassengerCount(v.passengers),
    };
  }).filter(v => v !== null) || [];

  const transfers = cart.transfer?.map((t: CartItemTransfer) => {
    const isPopulated = t.transfer && typeof t.transfer === 'object' && t.transfer.name;
    return {
      name: isPopulated ? t.transfer.name : 'Transfer',
      category: isPopulated && t.transfer.category?.name ? t.transfer.category.name : 'Sin categoría',
      price: isPopulated ? (t.transfer.price || 0) : 0,
      date: t.date,
      quantity: t.quantity || 1,
      airline: t.airline,
      flightNumber: t.flightNumber,
      passengers: getPassengerCount(t.passengers),
    };
  }).filter(t => t !== null) || [];

  const tours = cart.tours?.map((t: CartItemTour) => {
    const isPopulated = t.tour && typeof t.tour === 'object' && t.tour.name;
    return {
      name: isPopulated ? t.tour.name : 'Tour',
      category: isPopulated && t.tour.category?.name ? t.tour.category.name : 'Sin categoría',
      price: isPopulated ? (t.tour.price || 0) : 0,
      date: t.date,
      quantity: t.quantity || 1,
      passengers: getPassengerCount(t.passengers),
    };
  }).filter(t => t !== null) || [];

  const tickets = cart.tickets?.map((ti: CartItemTicket) => {
    const isPopulated = ti.ticket && typeof ti.ticket === 'object' && ti.ticket.name;
    return {
      name: isPopulated ? ti.ticket.name : 'Ticket',
      category: isPopulated && ti.ticket.category?.name ? ti.ticket.category.name : 'Sin categoría',
      price: isPopulated ? (ti.ticket.totalPrice || 0) : 0,
      date: ti.date,
      quantity: ti.quantity || 1,
      passengers: getPassengerCount(ti.passengers),
    };
  }).filter(ti => ti !== null) || [];

  const whatsappNumber = "+529841417024";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
  const phoneNumber = "+52 984 141 7024";
  const email = "oficinaveleta.moving@gmail.com";

  const saldoPendiente = totalReserva - totalPagado;
  const googleMapsUrl = `https://www.google.com/maps/search/MoovAdventures+Tulum/@20.2053617,-87.4710442,15z`;

  const subject = `Reserva con PAGO RECHAZADO #${bookingNumber} - Contáctanos para Generar Nuevo Link`;

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
          border-left: 4px solid #3498db;
          border-radius: 4px;
        }
        .item-details p { margin-bottom: 5px; }
        .vehicle-item { border-left-color: #3498db; }
        .transfer-item { border-left-color: #e67e22; }
        .tour-item { border-left-color: #2ecc71; }
        .ticket-item { border-left-color: #9b59b6; }
        .alert-box {
          background-color: #ffe6e6;
          border-left: 4px solid #dc3545;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .alert-box p { margin: 5px 0; color: #721c24; font-weight: 600; }
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
        <h1 style="color: #dc3545;">Reserva con PAGO RECHAZADO ❌</h1>

        <div class="alert-box">
          <p><strong>❌ PAGO RECHAZADO – CONTÁCTENOS PARA GENERAR NUEVAMENTE EL LINK DE PAGO</strong></p>
          <p>El pago de tu reserva fue rechazado. Por favor contáctanos para generar un nuevo link de pago y completar tu reserva.</p>
        </div>

        <div class="section contact-info" style="background-color: #e8f5e9; padding: 15px; border-radius: 4px; border-left: 4px solid #4caf50;">
          <h2 style="margin-top: 0;"><span class="emoji">📞</span> Información de Contacto</h2>
          <p><strong>📱 WhatsApp:</strong> <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">+52 984 141 7024</a></p>
          <p><strong>📧 Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>📍 Dirección:</strong> Calle 12 Sur Por avenida Guardianes Mayas, La Veleta, 77760 Tulum, Q.R.</p>
          <p><strong>⏰ Horario:</strong> 9:00 AM - 7:00 PM</p>
        </div>

        <p>Estamos aquí para ayudarte a completar tu reserva.</p>

        <div class="section">
          <h2>📝 Detalles generales de tu reserva:</h2>
          <p><strong>Número de reserva:</strong> ${bookingNumber}</p>
          <p><strong>Estado:</strong> <span style="color: #dc3545; font-weight: bold;">PAGO RECHAZADO</span></p>
          ${branchName !== 'Sucursal no especificada' ? `<p><strong>Sucursal de referencia:</strong> ${branchName}</p>` : ''}
          ${bookingData?.metadata?.hotel ? `<p><strong>Hotel:</strong> ${bookingData.metadata.hotel}</p>` : ''}
        </div>
        
        ${vehicles.length > 0 ? `
        <div class="section">
          <h3>🛵 Vehículo${vehicles.length > 1 ? 's' : ''} reservado${vehicles.length > 1 ? 's' : ''}:</h3>
          ${vehicles
        .map(
          (v) => {
            const startDate = v.startDate ? new Date(v.startDate) : null;
            const endDate = v.endDate ? new Date(v.endDate) : null;
            const days = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
            return `
                <div class="item-details vehicle-item">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📋 DETALLES DE RENTA</h4>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                      <p><strong>Tipo de Vehículo:</strong> ${v.name}</p>
                      <p><strong>Categoría:</strong> ${v.category}</p>
                      <p><strong>Unidades:</strong> 1</p>
                      ${v.passengers ? `<p><strong>Pasajeros:</strong> ${v.passengers}</p>` : ''}
                    </div>
                    <div>
                      <p><strong>Días:</strong> ${days} día${days !== 1 ? 's' : ''}</p>
                      <p><strong>Total:</strong> ${v.total.toFixed(2)} MXN</p>
                    </div>
                  </div>
                  
                  ${v.startDate && v.endDate ? `
                  <div style="background-color: #e8f4fd; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #2c3e50;">📅 FECHAS Y HORARIOS</h5>
                    <p style="margin: 5px 0;"><strong>Fecha y hora de inicio:</strong> ${formatDateTime(v.startDate)}</p>
                    <p style="margin: 5px 0;"><strong>Fecha y hora de fin:</strong> ${formatDateTime(v.endDate)}</p>
                  </div>
                  ` : ''}
                  
                  <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #856404;">⚠️ INFORMACIÓN IMPORTANTE</h5>
                    <p style="margin: 5px 0; font-size: 14px;">• Se requiere depósito de garantía</p>
                    ${bookingData?.metadata?.depositNote ? `<p style="margin: 5px 0; font-size: 14px; color: #d63031;"><strong>• Depósito registrado: ${bookingData.metadata.depositNote}</strong></p>` : ''}
                    <p style="margin: 5px 0; font-size: 14px;">• Presentar documento de identidad válido</p>
                    <p style="margin: 5px 0; font-size: 14px;">• Cascos y candado incluidos en la renta</p>
                  </div>
                  
                  <div style="background-color: #d1ecf1; padding: 10px; border-radius: 4px;">
                    <h5 style="margin: 0 0 8px 0; color: #0c5460;">🏪 ENTREGA Y DEVOLUCIÓN</h5>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Lugar de entrega:</strong> Sucursal MoovAdventures</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Lugar de devolución:</strong> Misma sucursal</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Horario:</strong> 9:00 AM - 7:00 PM</p>
                  </div>
                </div>
              `;
          }
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
                  <p><strong>Fecha y hora:</strong> ${formatDateTime(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
                  ${t.passengers ? `<p><strong>Pasajeros:</strong> ${t.passengers}</p>` : ''}
                  <p><strong>Precio:</strong> ${t.price.toFixed(2)} MXN</p>
                  ${t.airline || t.flightNumber ? `
                  <div style="background-color: #fff3e0; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #e65100;">✈️ INFORMACIÓN DE VUELO</h5>
                    ${t.airline ? `<p style="margin: 5px 0;"><strong>Aerolínea:</strong> ${t.airline}</p>` : ''}
                    ${t.flightNumber ? `<p style="margin: 5px 0;"><strong>Número de vuelo:</strong> ${t.flightNumber}</p>` : ''}
                  </div>
                  ` : ''}
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
                  <p><strong>Fecha y hora:</strong> ${formatDateTime(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Cantidad:</strong> ${t.quantity}</p>` : ''}
                  ${t.passengers ? `<p><strong>Pasajeros:</strong> ${t.passengers}</p>` : ''}
                  <p><strong>Precio:</strong> ${t.price.toFixed(2)} MXN</p>
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
                  <p><strong>Fecha y hora:</strong> ${formatDateTime(ti.date)}</p>
                  ${ti.quantity > 1 ? `<p><strong>Cantidad:</strong> ${ti.quantity}</p>` : ''}
                  ${ti.passengers ? `<p><strong>Pasajeros:</strong> ${ti.passengers}</p>` : ''}
                  <p><strong>Precio:</strong> ${ti.price.toFixed(2)} MXN</p>
                </div>
              `
        )
        .join('')}
        </div>` : ''}

        ${bookingData.requiresDelivery ? `
        <div class="section">
          <h2>🚚 Información de Delivery:</h2>
          <div class="item-details" style="background-color: #e8f5e9; border-left-color: #4caf50;">
            <p><strong>Servicio de delivery:</strong> Sí</p>
            <p><strong>Tipo de servicio:</strong> ${
              bookingData.deliveryType === 'round-trip' 
                ? 'Ida y vuelta (Round trip)' 
                : bookingData.oneWayType === 'pickup' 
                  ? 'Solo recogida (One way - Pickup)' 
                  : 'Solo entrega (One way - Delivery)'
            }</p>
            ${bookingData.deliveryAddress ? `<p><strong>Dirección:</strong> ${bookingData.deliveryAddress}</p>` : ''}
            ${bookingData.deliveryCost ? `<p><strong>Costo del delivery:</strong> ${bookingData.deliveryCost.toFixed(2)} MXN</p>` : ''}
            <div style="background-color: #fff9c4; padding: 10px; border-radius: 4px; margin-top: 10px;">
              <p style="margin: 0; font-size: 14px; color: #f57f17;"><strong>📍 Nota:</strong> ${
                bookingData.deliveryType === 'round-trip' 
                  ? 'El vehículo será entregado y recogido en la dirección especificada.' 
                  : bookingData.oneWayType === 'pickup'
                    ? 'El vehículo será recogido en la dirección especificada. La entrega inicial debe realizarse en la sucursal.'
                    : 'El vehículo será entregado en la dirección especificada. La devolución debe realizarse en la sucursal.'
              }</p>
            </div>
          </div>
        </div>` : ''}

        <div class="section payment-summary">
          <h2>💳 Resumen de pago:</h2>
          <p><strong>Total de la reserva:</strong> ${totalReserva.toFixed(2)} MXN</p>
          <p><strong>Total pagado (crédito/débito):</strong> ${totalPagado.toFixed(2)} MXN</p>
          <p><strong>Saldo pendiente:</strong> ${saldoPendiente.toFixed(2)} MXN</p>
          <p><strong>Método de pago:</strong> ${bookingData?.paymentMethod?.name || 'No especificado'}</p>
          ${saldoPendiente > 0 ? `
          <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px;">
            <p style="margin: 0; font-size: 14px; color: #856404;"><strong>💰 Método de pago del saldo:</strong> Efectivo, tarjeta de crédito/débito en sucursal</p>
          </div>
          ` : ''}
        </div>

        ${branchName !== 'Sucursal no especificada' ? `
        <div class="section pickup-info">
          <h2>📍 Ubicación de la sucursal:</h2>
          <p>Para vehículos, el retiro es en Sucursal ${branchName} – <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer">Ver en Google Maps</a></p>
          <p><strong>Dirección:</strong> Calle 12 Sur Por avenida Guardianes Mayas, La Veleta, 77760 Tulum, Q.R., México</p>
          <p><strong><span class="emoji">⏰</span> Horario de atención:</strong> 9:00 AM a 7:00 PM</p>
        </div>` : `
        <div class="section pickup-info">
          <h2>📍 Puntos de encuentro / Horarios:</h2>
          <p>Por favor, revisa los detalles específicos de cada tour, transfer o ticket para conocer los puntos de encuentro y horarios exactos.</p>
        </div>
        `}

        <div class="footer">
          <p>Estamos aquí para ayudarte!</p>
          <p><strong>El equipo de MoovAdventures</strong> <span class="emoji">🌴</span></p>
          <p>Experiencias y Rentas en Tulum</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
