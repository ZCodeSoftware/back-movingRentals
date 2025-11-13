/**
 * Constantes para los nombres de estados de booking
 * Centraliza los nombres de status para evitar inconsistencias
 */
export const BOOKING_STATUS = {
  COMPLETED: 'completed',
  APPROVED: 'APROBADO',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  CANCELADO: 'CANCELADO',
  REJECTED: 'RECHAZADO',
  RECHAZADO: 'RECHAZADO',
} as const;

export type BookingStatusType = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

/**
 * Estados que deben ser excluidos de reportes y cálculos financieros
 */
export const EXCLUDED_BOOKING_STATUSES = [
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.CANCELADO,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.RECHAZADO,
] as const;
