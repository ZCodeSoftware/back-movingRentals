/**
 * Constantes para los nombres de estados de booking
 * Centraliza los nombres de status para evitar inconsistencias
 */
export const BOOKING_STATUS = {
  COMPLETED: 'completed',
  APPROVED: 'APROBADO',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const;

export type BookingStatusType = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
