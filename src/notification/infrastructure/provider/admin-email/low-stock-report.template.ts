export function lowStockReportTemplate(adminName: string) {
  const lowStockReport = `
    <body style="font-family: Arial, sans-serif; max-width: 600px; background-color: #616A6B; justify-center;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <div style="max-width: 600px; padding: 20px; border-radius: 10px; margin: auto; background-color: #545050">
              <h1 style="color: white;">Reporte de productos con bajo stock</h1>
              <p style="color: white;">Hola ${adminName},</p>
              <p style="color: white;">Aquí tienes un resumen de los productos que están próximos a agotarse en inventario:</p>
              
              <table width="100%" style="margin: 20px 0; border-collapse: collapse;">
                <tr>
                  <th style="border: 1px solid #ddd; padding: 8px; color: white;">Producto</th>
                  <th style="border: 1px solid #ddd; padding: 8px; color: white;">Stock Disponible</th>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px; color: white;">Camiseta Negra</td>
                  <td style="border: 1px solid #ddd; padding: 8px; color: white;">5 unidades</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px; color: white;">Pantalón Azul</td>
                  <td style="border: 1px solid #ddd; padding: 8px; color: white;">3 unidades</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px; color: white;">Chaqueta Roja</td>
                  <td style="border: 1px solid #ddd; padding: 8px; color: white;">2 unidades</td>
                </tr>
              </table>

              <p style="color: white;">Por favor, revisa el inventario y considera reabastecer estos productos para evitar posibles desabastecimientos.</p>
              <p style="color: white;">Atentamente, el equipo de DYM Indumentaria.</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
  `;

  return lowStockReport;
}
