import { BookingModel } from '../../../../booking/domain/models/booking.model';

export function generateUserBookingCancellationEn(booking: BookingModel): { subject: string; html: string } {
  const bookingData = booking.toJSON();
  const bookingNumber = bookingData.bookingNumber || 'N/A';
  const total = bookingData.total || 0;
  const createdAt = bookingData.createdAt ? new Date(bookingData.createdAt).toLocaleDateString('en-US') : 'N/A';

  let cartDetails = '';
  try {
    const cart = JSON.parse(bookingData.cart || '{}');
    
    // Process vehicles
    if (cart.vehicles && cart.vehicles.length > 0) {
      cartDetails += '<h3>🚗 Vehicles:</h3><ul>';
      cart.vehicles.forEach((item: any) => {
        cartDetails += `<li>${item.vehicle?.name || 'Vehicle'} - $${item.total || 0}</li>`;
      });
      cartDetails += '</ul>';
    }

    // Process transfers
    if (cart.transfer && cart.transfer.length > 0) {
      cartDetails += '<h3>🚐 Transfers:</h3><ul>';
      cart.transfer.forEach((item: any) => {
        cartDetails += `<li>${item.transfer?.name || 'Transfer'} - Quantity: ${item.quantity || 1} - $${(item.transfer?.price || 0) * (item.quantity || 1)}</li>`;
      });
      cartDetails += '</ul>';
    }

    // Process tours
    if (cart.tours && cart.tours.length > 0) {
      cartDetails += '<h3>🗺️ Tours:</h3><ul>';
      cart.tours.forEach((item: any) => {
        cartDetails += `<li>${item.tour?.name || 'Tour'} - Quantity: ${item.quantity || 1} - $${(item.tour?.price || 0) * (item.quantity || 1)}</li>`;
      });
      cartDetails += '</ul>';
    }

    // Process tickets
    if (cart.tickets && cart.tickets.length > 0) {
      cartDetails += '<h3>🎫 Tickets:</h3><ul>';
      cart.tickets.forEach((item: any) => {
        cartDetails += `<li>${item.ticket?.name || 'Ticket'} - Quantity: ${item.quantity || 1} - $${(item.ticket?.totalPrice || 0) * (item.quantity || 1)}</li>`;
      });
      cartDetails += '</ul>';
    }
  } catch (error) {
    cartDetails = '<p>Cart details not available</p>';
  }

  const subject = `Booking Cancelled - #${bookingNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled</title>
        <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f7f6;
          color: #333;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 25px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(0,0,0,0.05);
        }
        h1, h2, h3 {
          color: #e74c3c;
          margin-top: 0;
          font-weight: 600;
        }
        h1 {
          font-size: 28px;
          text-align: center;
          margin-bottom: 30px;
        }
        .booking-info {
          background-color: #fff5f5;
          border: 1px solid #fed7d7;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .booking-info h2 {
          margin-top: 0;
          color: #e74c3c;
          font-size: 20px;
        }
        .booking-details {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .booking-details h3 {
          color: #2c3e50;
          margin-top: 0;
          margin-bottom: 15px;
        }
        ul {
          margin: 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
          line-height: 1.5;
        }
        .total {
          font-size: 18px;
          font-weight: bold;
          color: #e74c3c;
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          background-color: #fff5f5;
          border-radius: 6px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .contact-info {
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 20px;
          margin-top: 25px;
          text-align: center;
        }
        .contact-info h3 {
          color: #0369a1;
          margin-top: 0;
        }
        @media screen and (max-width: 480px) {
          .email-container { padding: 20px; margin: 10px auto; }
          h1 { font-size: 22px; }
        }
        </style>
    </head>
    <body>
      <div class="email-container">
        <h1>Booking Cancelled ❌</h1>
        
        <div class="booking-info">
          <h2>Booking Information</h2>
          <p><strong>Booking Number:</strong> #${bookingNumber}</p>
          <p><strong>Creation Date:</strong> ${createdAt}</p>
          <p><strong>Status:</strong> CANCELLED</p>
        </div>

        <div class="booking-details">
          <h3>Cancelled Booking Details:</h3>
          ${cartDetails}
        </div>

        <div class="total">
          Cancelled Booking Total: $${total.toLocaleString('en-US')}
        </div>

        <div class="contact-info">
          <h3>Need help?</h3>
          <p>If you have any questions about your booking cancellation or need assistance, please don't hesitate to contact us.</p>
          <p><strong>Email:</strong> support@moovadventures.com</p>
          <p><strong>Phone:</strong> +1 (555) 123-4567</p>
        </div>

        <div class="footer">
          <p>Thank you for choosing MoovAdventures</p>
          <p>This is an automated email, please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}