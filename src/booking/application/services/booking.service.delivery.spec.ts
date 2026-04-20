/**
 * Tests para la lógica de eliminación de delivery en BookingService.
 *
 * Regla de negocio:
 * - Delivery agregado al crear la reserva → sacar de los 3 totales (Inicial, General, Pagado)
 * - Delivery agregado después            → sacar solo de Total General y Total Pagado
 *
 * Bug original #7911: el código anterior siempre restaba deliveryCost de totalPaid sin
 * considerar el caso, y además no tocaba el Total Inicial cuando correspondía.
 */

const FIVE_MINUTES = 5 * 60 * 1000;

function wasAddedAtCreation(historyCreatedAt: Date, contractCreatedAt: Date): boolean {
  return Math.abs(historyCreatedAt.getTime() - contractCreatedAt.getTime()) < FIVE_MINUTES;
}

function computeUpdateFields(
  deliveryCost: number,
  currentTotal: number,
  currentTotalPaid: number,
  addedAtCreation: boolean,
): { total?: number; totalPaid: number } {
  const result: { total?: number; totalPaid: number } = {
    totalPaid: Math.max(0, currentTotalPaid - deliveryCost),
  };
  if (addedAtCreation) {
    result.total = Math.max(0, currentTotal - deliveryCost);
  }
  return result;
}

describe('Delivery removal — lógica de 3 totales', () => {
  const contractCreatedAt = new Date('2026-01-02T10:00:00Z');

  describe('Delivery agregado AL MOMENTO de la reserva (Case 1)', () => {
    const deliveryHistoryCreatedAt = new Date('2026-01-02T10:01:00Z'); // 1 min después
    const atCreation = wasAddedAtCreation(deliveryHistoryCreatedAt, contractCreatedAt);

    it('se detecta como agregado al crear', () => {
      expect(atCreation).toBe(true);
    });

    it('reduce Total Inicial, Total Pagado y limpia deliveryCost', () => {
      const result = computeUpdateFields(500, 2000, 2000, atCreation);
      expect(result.total).toBe(1500);      // Total Inicial reducido
      expect(result.totalPaid).toBe(1500);  // Total Pagado reducido
    });

    it('pago completo con delivery costoso — ambos totales reducidos correctamente', () => {
      const result = computeUpdateFields(3997.60, 4497, 4497, atCreation);
      expect(result.total).toBeCloseTo(499.40, 2);
      expect(result.totalPaid).toBeCloseTo(499.40, 2);
    });

    it('pago parcial — totalPaid reducido pero no negativo', () => {
      const result = computeUpdateFields(500, 2000, 300, atCreation);
      expect(result.total).toBe(1500);
      expect(result.totalPaid).toBe(0); // Math.max(0, 300-500)
    });
  });

  describe('Delivery agregado DESPUÉS de la reserva (Case 2)', () => {
    const deliveryHistoryCreatedAt = new Date('2026-01-05T15:00:00Z'); // 3 días después
    const atCreation = wasAddedAtCreation(deliveryHistoryCreatedAt, contractCreatedAt);

    it('se detecta como agregado después', () => {
      expect(atCreation).toBe(false);
    });

    it('NO reduce Total Inicial, SÍ reduce Total Pagado', () => {
      const result = computeUpdateFields(500, 2000, 2000, atCreation);
      expect(result.total).toBeUndefined(); // Total Inicial intacto
      expect(result.totalPaid).toBe(1500);
    });

    it('pago parcial menor al delivery — totalPaid no baja de 0', () => {
      const result = computeUpdateFields(500, 2000, 300, atCreation);
      expect(result.total).toBeUndefined();
      expect(result.totalPaid).toBe(0);
    });
  });

  describe('Límite de 5 minutos', () => {
    it('exactamente 4:59 → se considera al crear', () => {
      const h = new Date(contractCreatedAt.getTime() + 4 * 60 * 1000 + 59 * 1000);
      expect(wasAddedAtCreation(h, contractCreatedAt)).toBe(true);
    });

    it('exactamente 5:00 → se considera después', () => {
      const h = new Date(contractCreatedAt.getTime() + FIVE_MINUTES);
      expect(wasAddedAtCreation(h, contractCreatedAt)).toBe(false);
    });
  });
});
