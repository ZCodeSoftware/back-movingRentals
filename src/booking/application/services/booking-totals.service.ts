import { Injectable } from '@nestjs/common';

export interface BookingTotals {
  originalTotal: number;
  netTotal: number;
  adjustments: Array<{
    eventType: string;
    eventName: string;
    amount: number;
    direction: 'IN' | 'OUT';
    date: Date;
    details: string;
  }>;
}

@Injectable()
export class BookingTotalsService {
  /**
   * Calcula los totales de una reserva basándose en el histórico del contrato
   * @param originalTotal Total original de la reserva
   * @param contractHistory Histórico del contrato con eventos monetarios
   * @returns Totales calculados con ajustes
   */
  calculateTotals(originalTotal: number, contractHistory: any[]): BookingTotals {
    let netTotal = originalTotal;
    const adjustments: BookingTotals['adjustments'] = [];

    if (contractHistory && contractHistory.length > 0) {
      for (const historyEntry of contractHistory) {
        // Ignorar movimientos eliminados
        if (historyEntry.isDeleted === true) {
          continue;
        }

        // Verificar si el evento tiene metadatos con información monetaria
        if (historyEntry.eventMetadata && historyEntry.eventMetadata.amount) {
          const amount = parseFloat(historyEntry.eventMetadata.amount);
          
          if (!isNaN(amount) && amount !== 0) {
            // Determinar la dirección del movimiento basándose en el tipo de evento
            const direction = this.determineMovementDirection(
              historyEntry.eventType?.name || historyEntry.details,
              historyEntry.eventMetadata
            );

            // Aplicar el ajuste al total neto
            if (direction === 'IN') {
              netTotal += amount;
            } else {
              netTotal -= amount;
            }

            // Agregar a la lista de ajustes
            adjustments.push({
              eventType: historyEntry.eventType?._id || 'unknown',
              eventName: historyEntry.eventType?.name || historyEntry.details || 'Evento sin nombre',
              amount: amount,
              direction: direction,
              date: historyEntry.createdAt || new Date(),
              details: historyEntry.details || ''
            });
          }
        }

        // También verificar si hay información de extensión con monto
        if (historyEntry.action === 'EXTENSION_UPDATED' && historyEntry.changes) {
          for (const change of historyEntry.changes) {
            if (change.field === 'extension' && change.newValue?.extensionAmount) {
              const extensionAmount = parseFloat(change.newValue.extensionAmount);
              
              if (!isNaN(extensionAmount) && extensionAmount > 0) {
                netTotal += extensionAmount;
                
                adjustments.push({
                  eventType: 'extension',
                  eventName: 'Extensión de Renta',
                  amount: extensionAmount,
                  direction: 'IN',
                  date: historyEntry.createdAt || new Date(),
                  details: 'Extensión de contrato'
                });
              }
            }
          }
        }
      }
    }

    return {
      originalTotal,
      netTotal: Math.round(netTotal * 100) / 100, // Redondear a 2 decimales
      adjustments
    };
  }

  /**
   * Determina la dirección del movimiento basándose en el tipo de evento
   * @param eventName Nombre del evento
   * @param metadata Metadatos del evento
   * @returns Dirección del movimiento
   */
  private determineMovementDirection(eventName: string, metadata: any): 'IN' | 'OUT' {
    if (!eventName) return 'IN';

    const eventNameUpper = eventName.toUpperCase();
    
    // Eventos que típicamente representan ingresos (IN)
    const incomeEvents = [
      'EXTENSION DE RENTA',
      'DELIVERY',
      'TRANSFER',
      'LLANTA PAGADA POR CLIENTE',
      'CASCO PAGADO POR CLIENTE',
      'WIFI',
      'HORAS EXTRAS',
      'VEHICULO PAGADO POR CLIENTE',
      'CANDADO',
      'ASIENTO BICICLETA PAGADO POR CLIENTE',
      'ESPEJOS PAGADO POR CLIENTE',
      'CANASTA PAGADA POR CLIENTE',
      'PROPINA',
      'REPARACION PAGADA POR CLIENTE',
      'COMBUSTIBLE PAGADO POR CLIENTE',
      'COPIA DE LLAVE - CLIENTE',
      'LOCK - CLIENTE',
      'TOURS',
      'RIDE',
      'LATE PICK UP',
      'RENTA',
      'IMPRESIONES A COLOR'
    ];

    // Eventos que típicamente representan gastos (OUT)
    const expenseEvents = [
      'ROBO',
      'RESCATE VEHICULO',
      'CANCELACION',
      'CRASH',
      'GASTO PARA TOURS'
    ];

    // Verificar si es un evento de ingreso
    for (const incomeEvent of incomeEvents) {
      if (eventNameUpper.includes(incomeEvent)) {
        return 'IN';
      }
    }

    // Verificar si es un evento de gasto
    for (const expenseEvent of expenseEvents) {
      if (eventNameUpper.includes(expenseEvent)) {
        return 'OUT';
      }
    }

    // Si hay información explícita en los metadatos
    if (metadata && metadata.direction) {
      return metadata.direction.toUpperCase() === 'OUT' ? 'OUT' : 'IN';
    }

    // Por defecto, considerar como ingreso
    return 'IN';
  }
}