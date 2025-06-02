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


export function generateUserBookingConfirmationEn(
    booking: BookingModel
): { subject: string; html: string } {
    const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
    const cartString = bookingData.cart;

    let cart: ParsedCart = {};
    const bookingNumber = bookingData.bookingNumber || 'N/A';
    const totalReserva = bookingData.total || 0;
    const totalPagado = bookingData.totalPaid || 0;

    const errorSubject = `Issue with your booking #${bookingNumber} at MoovAdventures`;
    const errorHtml = `
    <p>Hello,</p>
    <p>We encountered an issue while trying to generate the full details for your booking #${bookingNumber}.</p>
    <p>Please contact us directly to verify the status and details of your booking.</p>
    <p>We apologize for any inconvenience.</p>
    <p>The MoovAdventures Team</p>`;

    if (!cartString || typeof cartString !== 'string') {
        console.error(`Error: booking.cart is not a valid JSON string for booking #${bookingNumber}.`);
        return { subject: errorSubject, html: errorHtml };
    }

    try {
        cart = JSON.parse(cartString);
    } catch (error) {
        console.error(`Error parsing booking.cart for booking #${bookingNumber}:`, error);
        return { subject: errorSubject, html: errorHtml };
    }

    const branchName = cart.branch?.name || 'Branch not specified';

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
        <h1>Thank you for your booking! <span class="emoji">🎉</span></h1>
        <p>We are excited to accompany you on your next adventure in Tulum.</p>

        <div class="section">
          <h2>📝 General Booking Details:</h2>
          <p><strong>Booking number:</strong> ${bookingNumber}</p>
          ${branchName !== 'Branch not specified' ? `<p><strong>Reference Branch:</strong> ${branchName}</p>` : ''}
        </div>
        
        ${vehicles.length > 0 ? `
        <div class="section">
          <h3>🛵 Vehicle${vehicles.length > 1 ? 's' : ''} booked:</h3>
          ${vehicles
                .map(
                    (v) => `
                <div class="item-details vehicle-item">
                  <p><strong>Name:</strong> ${v.name}</p>
                  <p><strong>Category:</strong> ${v.category}</p>
                  ${v.startDate && v.endDate ? `<p><strong>Period:</strong> ${formatDateToEnglish(v.startDate)} - ${formatDateToEnglish(v.endDate)}</p>` : ''}
                  <p><strong>Subtotal:</strong> $${v.total.toFixed(2)} MXN</p>
                </div>
              `
                )
                .join('')}
        </div>` : ''}

        ${transfers.length > 0 ? `
        <div class="section">
          <h3>🚐 Transfer${transfers.length > 1 ? 's' : ''} booked:</h3>
          ${transfers
                .map(
                    (t) => `
                <div class="item-details transfer-item">
                  <p><strong>Service:</strong> ${t.name}</p>
                  <p><strong>Category:</strong> ${t.category}</p>
                  <p><strong>Date:</strong> ${formatDateToEnglish(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Quantity:</strong> ${t.quantity}</p>` : ''}
                  <p><strong>Price:</strong> $${t.price.toFixed(2)} MXN</p>
                </div>
              `
                )
                .join('')}
        </div>` : ''}

        ${tours.length > 0 ? `
        <div class="section">
          <h3>🗺️ Tour${tours.length > 1 ? 's' : ''} booked:</h3>
          ${tours
                .map(
                    (t) => `
                <div class="item-details tour-item">
                  <p><strong>Name:</strong> ${t.name}</p>
                  <p><strong>Category:</strong> ${t.category}</p>
                  <p><strong>Date:</strong> ${formatDateToEnglish(t.date)}</p>
                  ${t.quantity > 1 ? `<p><strong>Quantity:</strong> ${t.quantity}</p>` : ''}
                  <p><strong>Price:</strong> $${t.price.toFixed(2)} MXN</p>
                </div>
              `
                )
                .join('')}
        </div>` : ''}

        ${tickets.length > 0 ? `
        <div class="section">
          <h3>🎟️ Ticket${tickets.length > 1 ? 's' : ''} booked:</h3>
          ${tickets
                .map(
                    (ti) => `
                <div class="item-details ticket-item">
                  <p><strong>Name:</strong> ${ti.name}</p>
                  <p><strong>Category:</strong> ${ti.category}</p>
                  <p><strong>Date:</strong> ${formatDateToEnglish(ti.date)}</p>
                  ${ti.quantity > 1 ? `<p><strong>Quantity:</strong> ${ti.quantity}</p>` : ''}
                  <p><strong>Price:</strong> $${ti.price.toFixed(2)} MXN</p>
                </div>
              `
                )
                .join('')}
        </div>` : ''}

        <div class="section payment-summary">
          <h2>💳 Payment Summary:</h2>
          <p><strong>Booking total:</strong> $${totalReserva.toFixed(2)} MXN</p>
          <p><strong>Total paid:</strong> $${totalPagado.toFixed(2)} MXN</p>
          <p><strong>Balance due:</strong> $${saldoPendiente.toFixed(2)} MXN</p>
        </div>

        ${branchName !== 'Branch not specified' ? `
        <div class="section pickup-info">
          <h2>📍 Pickup Information (Vehicles):</h2>
          <p>For vehicles, pickup is at ${branchName} Branch – <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer">View on Google Maps</a></p>
          <p><strong><span class="emoji">⏰</span> Opening hours:</strong> 9:00 AM to 7:00 PM</p>
        </div>` : `
        <div class="section pickup-info">
          <h2>📍 Meeting Points / Schedules:</h2>
          <p>Please check the specific details of each tour, transfer, or ticket for exact meeting points and schedules.</p>
        </div>
        `}

        <div class="section contact-info">
          <h2><span class="emoji">📞</span> Questions?</h2>
          <p>Contact us via WhatsApp: <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">${whatsappNumber}</a></p>
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