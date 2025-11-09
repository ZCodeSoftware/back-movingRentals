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
  airline: string;
  flightNumber: string;
  quantity: number;
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

function formatDateToEnglish(dateString?: string): string {
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

function formatDateTimeToEnglish(dateString?: string): string {
  if (!dateString) return 'Date and time not specified';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
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

function formatDateTimeRangeToEnglish(
  startDate?: string,
  endDate?: string,
): string {
  if (!startDate || !endDate) return 'Dates not specified';
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateStr = start.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const startTime = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const endTime = end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // If same day, show: "August 30, 2025, from 10:00 AM to 6:00 PM"
    if (start.toDateString() === end.toDateString()) {
      return `${dateStr}, from ${startTime} to ${endTime}`;
    } else {
      // If different days, show complete dates
      const endDateStr = end.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return `From ${dateStr} at ${startTime} to ${endDateStr} at ${endTime}`;
    }
  } catch (e) {
    return `${startDate} - ${endDate}`;
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

export function generateUserBookingConfirmationEn(
  booking: BookingModel,
  userEmail?: string,
  userData?: any,
): { subject: string; html: string } {
  const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
  const cartString = bookingData.cart;

  let cart: ParsedCart = {};
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const totalReserva = bookingData.total || 0;
  const totalPagado = bookingData.totalPaid || 0;

  // Get user information
  const customerName = userData?.name || bookingData.user?.name || 'Customer';
  const customerLastName =
    userData?.lastName || bookingData.user?.lastName || '';
  const customerFullName = `${customerName} ${customerLastName}`.trim();

  const errorSubject = `Issue with your booking #${bookingNumber} at MoovAdventures`;
  const errorHtml = `
    <p>Hello,</p>
    <p>We encountered an issue while trying to generate the full details for your booking #${bookingNumber}.</p>
    <p>Please contact us directly to verify the status and details of your booking.</p>
    <p>We apologize for any inconvenience.</p>
    <p>The MoovAdventures Team</p>`;

  if (!cartString || typeof cartString !== 'string') {
    console.error(
      `Error: booking.cart is not a valid JSON string for booking #${bookingNumber}.`,
    );
    return { subject: errorSubject, html: errorHtml };
  }

  try {
    cart = JSON.parse(cartString);
  } catch (error) {
    console.error(
      `Error parsing booking.cart for booking #${bookingNumber}:`,
      error,
    );
    return { subject: errorSubject, html: errorHtml };
  }

  const branchName = cart.branch?.name || 'Branch not specified';

  const vehicles = cart.vehicles?.map((v: CartItemVehicle) => {
    const isPopulated = v.vehicle && typeof v.vehicle === 'object' && v.vehicle.name;
    return {
      name: isPopulated ? v.vehicle.name : 'Vehicle',
      category: isPopulated && v.vehicle.category?.name ? v.vehicle.category.name : 'No category',
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
      category: isPopulated && t.transfer.category?.name ? t.transfer.category.name : 'No category',
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
      category: isPopulated && t.tour.category?.name ? t.tour.category.name : 'No category',
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
      category: isPopulated && ti.ticket.category?.name ? ti.ticket.category.name : 'No category',
      price: isPopulated ? (ti.ticket.totalPrice || 0) : 0,
      date: ti.date,
      quantity: ti.quantity || 1,
      passengers: getPassengerCount(ti.passengers),
    };
  }).filter(ti => ti !== null) || [];

  const saldoPendiente = totalReserva - totalPagado;

  const googleMapsUrl = `https://www.google.com/maps/search/MoovAdventures+Tulum/@20.2053617,-87.4710442,15z`;
  const whatsappNumber = '+529841417024';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  const subject = `Your booking #${bookingNumber} at MoovAdventures is confirmed! 🚀`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
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
          border-left: 4px solid #3498db; /* Main accent color */
          border-radius: 4px;
        }
        .item-details p { margin-bottom: 5px; }
        /* Specific accent colors for different item types (optional) */
        .vehicle-item { border-left-color: #3498db; } /* Blue */
        .transfer-item { border-left-color: #e67e22; } /* Orange */
        .tour-item { border-left-color: #2ecc71; } /* Green */
        .ticket-item { border-left-color: #9b59b6; } /* Purple */

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
        <h1 style="color: #4caf50;">Booking Confirmed ✅</h1>
        <p>We are excited to accompany you on your next adventure in Tulum.</p>

        <div class="section">
          <h2>📝 General Booking Details:</h2>
          <p><strong>Booking number:</strong> ${bookingNumber}</p>
          ${branchName !== 'Branch not specified' ? `<p><strong>Reference Branch:</strong> ${branchName}</p>` : ''}
          ${bookingData?.metadata?.hotel ? `<p><strong>Hotel:</strong> ${bookingData.metadata.hotel}</p>` : ''}
        </div>
        
        ${
          vehicles.length > 0
            ? `
        <div class="section">
          <h3>Vehicle${vehicles.length > 1 ? 's' : ''} booked:</h3>
          ${vehicles
            .map((v) => {
              const startDate = v.startDate ? new Date(v.startDate) : null;
              const endDate = v.endDate ? new Date(v.endDate) : null;
              const days =
                startDate && endDate
                  ? Math.ceil(
                      (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : 0;
              const pricePerDay = days > 0 ? v.total / days : 0;

              return `
                <div class="item-details vehicle-item">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📋 RENTAL DETAILS</h4>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                      <p><strong>Vehicle Type:</strong> ${v.name}</p>
                      <p><strong>Category:</strong> ${v.category}</p>
                      <p><strong>Units:</strong> 1</p>
                      ${v.passengers ? `<p><strong>Passengers:</strong> ${v.passengers}</p>` : ''}
                    </div>
                    <div>
                      <p><strong>Days:</strong> ${days} day${days !== 1 ? 's' : ''}</p>
                      <p><strong>Total:</strong> ${v.total.toFixed(2)} MXN</p>
                    </div>
                  </div>
                  
                  ${
                    v.startDate && v.endDate
                      ? `
                  <div style="background-color: #e8f4fd; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #2c3e50;">📅 DATES & TIMES</h5>
                    <p style="margin: 5px 0;"><strong>Start date & time:</strong> ${formatDateTimeToEnglish(v.startDate)}</p>
                    <p style="margin: 5px 0;"><strong>End date & time:</strong> ${formatDateTimeToEnglish(v.endDate)}</p>
                  </div>
                  `
                      : ''
                  }
                  
                  <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #856404;">⚠️ IMPORTANT INFORMATION</h5>
                    <p style="margin: 5px 0; font-size: 14px;">• Security deposit required</p>
                    ${bookingData?.metadata?.depositNote ? `<p style="margin: 5px 0; font-size: 14px; color: #d63031;"><strong>• Deposit registered: ${bookingData.metadata.depositNote}</strong></p>` : ''}
                    <p style="margin: 5px 0; font-size: 14px;">• Valid ID document required</p>
                    <p style="margin: 5px 0; font-size: 14px;">• Helmets and lock included in rental</p>
                  </div>
                  
                  <div style="background-color: #d1ecf1; padding: 10px; border-radius: 4px;">
                    <h5 style="margin: 0 0 8px 0; color: #0c5460;">🏪 PICKUP & DROP-OFF</h5>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Pickup location:</strong> MoovAdventures Branch</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Drop-off location:</strong> Same branch</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Hours:</strong> 9:00 AM - 7:00 PM</p>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`
            : ''
        }

        ${
          transfers.length > 0
            ? `
        <div class="section">
          <h3>🚐 Transfer${transfers.length > 1 ? 's' : ''} booked:</h3>
          ${transfers
            .map(
              (t) => `
                <div class="item-details transfer-item">
                  <p><strong>Service:</strong> ${t.name}</p>
                  <p><strong>Category:</strong> ${t.category}</p>
                  <p><strong>Date & time:</strong> ${formatDateTimeToEnglish(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Quantity:</strong> ${t.quantity}</p>` : ''}
                  ${t.passengers ? `<p><strong>Passengers:</strong> ${t.passengers}</p>` : ''}
                  <p><strong>Price:</strong> ${t.price.toFixed(2)} MXN</p>
                  ${t.airline || t.flightNumber ? `
                  <div style="background-color: #fff3e0; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #e65100;">✈️ FLIGHT INFORMATION</h5>
                    ${t.airline ? `<p style="margin: 5px 0;"><strong>Airline:</strong> ${t.airline}</p>` : ''}
                    ${t.flightNumber ? `<p style="margin: 5px 0;"><strong>Flight number:</strong> ${t.flightNumber}</p>` : ''}
                  </div>
                  ` : ''}
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
          <h3>🗺️ Tour${tours.length > 1 ? 's' : ''} booked:</h3>
          ${tours
            .map(
              (t) => `
                <div class="item-details tour-item">
                  <p><strong>Name:</strong> ${t.name}</p>
                  <p><strong>Category:</strong> ${t.category}</p>
                  <p><strong>Date & time:</strong> ${formatDateTimeToEnglish(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Quantity:</strong> ${t.quantity}</p>` : ''}
                  ${t.passengers ? `<p><strong>Passengers:</strong> ${t.passengers}</p>` : ''}
                  <p><strong>Price:</strong> ${t.price.toFixed(2)} MXN</p>
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
          <h3>🎟️ Ticket${tickets.length > 1 ? 's' : ''} booked:</h3>
          ${tickets
            .map(
              (ti) => `
                <div class="item-details ticket-item">
                  <p><strong>Name:</strong> ${ti.name}</p>
                  <p><strong>Category:</strong> ${ti.category}</p>
                  <p><strong>Date & time:</strong> ${formatDateTimeToEnglish(ti.date)}</p>
                  ${ti.quantity > 1 ? `<p><strong>Quantity:</strong> ${ti.quantity}</p>` : ''}
                  ${ti.passengers ? `<p><strong>Passengers:</strong> ${ti.passengers}</p>` : ''}
                  <p><strong>Price:</strong> ${ti.price.toFixed(2)} MXN</p>
                </div>
              `,
            )
            .join('')}
        </div>`
            : ''
        }

        ${
          bookingData.requiresDelivery
            ? `
        <div class="section">
          <h2>🚚 Delivery Information:</h2>
          <div class="item-details" style="background-color: #e8f5e9; border-left-color: #4caf50;">
            <p><strong>Delivery service:</strong> Yes</p>
            <p><strong>Service type:</strong> ${
              bookingData.deliveryType === 'round-trip'
                ? 'Round trip'
                : bookingData.oneWayType === 'pickup'
                  ? 'One way - Pickup only'
                  : 'One way - Delivery only'
            }</p>
            ${bookingData.deliveryAddress ? `<p><strong>Address:</strong> ${bookingData.deliveryAddress}</p>` : ''}
            ${bookingData.deliveryCost ? `<p><strong>Delivery cost:</strong> ${bookingData.deliveryCost.toFixed(2)} MXN</p>` : ''}
            <div style="background-color: #fff9c4; padding: 10px; border-radius: 4px; margin-top: 10px;">
              <p style="margin: 0; font-size: 14px; color: #f57f17;"><strong>📍 Note:</strong> ${
                bookingData.deliveryType === 'round-trip'
                  ? 'The vehicle will be delivered and picked up at the specified address.'
                  : bookingData.oneWayType === 'pickup'
                    ? 'The vehicle will be picked up from the specified address. Initial pickup must be done at the branch.'
                    : 'The vehicle will be delivered to the specified address. Return must be made at the branch.'
              }</p>
            </div>
          </div>
        </div>`
            : ''
        }

        <div class="section payment-summary">
          <h2>💳 Payment Summary:</h2>
          <p><strong>Booking total:</strong> ${totalReserva.toFixed(2)} MXN</p>
          <p><strong>Total paid (credit/debit):</strong> ${totalPagado.toFixed(2)} MXN</p>
          <p><strong>Balance due:</strong> ${saldoPendiente.toFixed(2)} MXN</p>
          <p><strong>Payment method:</strong> ${bookingData?.paymentMethod?.name || 'Not specified'}</p>
          ${
            saldoPendiente > 0
              ? `
          <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px;">
            <p style="margin: 0; font-size: 14px; color: #856404;"><strong>💰 Balance payment method:</strong> Cash, credit/debit card at branch</p>
          </div>
          `
              : ''
          }
        </div>

        ${
          branchName !== 'Branch not specified'
            ? `
        <div class="section pickup-info">
          <h2>📍 Branch Location:</h2>
          <p>For vehicles, pickup is at ${branchName} Branch – <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer">View on Google Maps</a></p>
          <p><strong>Address:</strong> Calle 12 Sur Por avenida Guardianes Mayas, La Veleta, 77760 Tulum, Q.R., Mexico</p>
          <p><strong><span class="emoji">⏰</span> Opening hours:</strong> 9:00 AM to 7:00 PM</p>
        </div>`
            : `
        <div class="section pickup-info">
          <h2>📍 Meeting Points / Schedules:</h2>
          <p>Please check the specific details of each tour, transfer, or ticket for exact meeting points and schedules.</p>
        </div>
        `
        }

        <div class="section contact-info">
          <h2><span class="emoji">📞</span> Questions?</h2>
          <div class="item-details" style="background-color: #e3f2fd; border-left-color: #2196f3;">
            <p><strong>📱 WhatsApp:</strong> <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">+52 984 141 7024</a></p>
            <p><strong>📧 Email:</strong> <a href="mailto:oficinaveleta.moving@gmail.com">oficinaveleta.moving@gmail.com</a></p>
            <p><strong>📍 Address:</strong> Calle 12 Sur Por avenida Guardianes Mayas, La Veleta, 77760 Tulum, Q.R.</p>
            <p><strong>⏰ Hours:</strong> 9:00 AM - 7:00 PM</p>
          </div>
        </div>

        <div class="footer">
          <p>See you soon!</p>
          <p><strong>The MoovAdventures Team</strong> <span class="emoji">🌴</span></p>
          <p>Experiences and Rentals in Tulum</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
