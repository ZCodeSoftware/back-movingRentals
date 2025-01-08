import { BookingModel } from '../../../../booking/domain/models/booking.model';

export function generateUserBookingHtml(booking: BookingModel): string {
  const cart = JSON.parse(booking.toJSON().cart);

  const branchName = cart.branch.name;
  const vehicles = cart.vehicles.map((v: any) => ({
    name: v.vehicle.name,
    category: v.vehicle.category.name,
    total: v.total,
  }));

  const totalPrice = vehicles.reduce((sum, v) => sum + v.total, 0);

  const html = `
    <h1>Reserva Creada</h1>
    <p>Gracias por realizar tu reserva en Moving Rentals.</p>
    <h2>Detalles de la Reserva:</h2>
    <p><strong>Sucursal:</strong> ${branchName}</p>
    <h3>Vehículos Reservados:</h3>
    <ul>
      ${vehicles
        .map(
          (v) =>
            `<li><strong>Nombre:</strong> ${v.name} | <strong>Categoría:</strong> ${v.category} | <strong>Precio:</strong> $${v.total}</li>`,
        )
        .join('')}
    </ul>
    <p><strong>Precio Total:</strong> $${totalPrice}</p>
    <p>Si tienes alguna duda, contáctanos.</p>
  `;

  return html;
}
