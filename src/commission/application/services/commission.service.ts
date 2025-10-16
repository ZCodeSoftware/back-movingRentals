import { Inject, Injectable } from '@nestjs/common';
import SymbolsCommission from '../../symbols-commission';
import SymbolsBooking from '../../../booking/symbols-booking';
import { CommissionModel } from '../../domain/models/commission.model';
import { ICommissionRepository } from '../../domain/repositories/commission.interface.repository';
import { ICommissionService } from '../../domain/services/commission.interface.service';
import { IBookingRepository } from '../../../booking/domain/repositories/booking.interface.repository';
import { BookingModel } from '../../../booking/domain/models/booking.model';

@Injectable()
export class CommissionService implements ICommissionService {
  constructor(
    @Inject(SymbolsCommission.ICommissionRepository)
    private readonly repository: ICommissionRepository,
    @Inject(SymbolsBooking.IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async create(commission: Partial<CommissionModel>): Promise<CommissionModel> {
    const model = CommissionModel.create(commission);
    return this.repository.create(model);
  }

  async listByOwner(ownerId: string, filters: any = {}): Promise<{
    data: CommissionModel[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    return this.repository.findAllByOwner(ownerId, filters);
  }

  async pay(id: string): Promise<CommissionModel> {
    return this.repository.markAsPaid(id);
  }

  async deleteById(id: string): Promise<void> {
    // Obtener los detalles de la comisión antes de eliminarla
    const commissionDetails = await this.repository.getCommissionDetailsById(id);
    
    // Eliminar la comisión
    await this.repository.deleteById(id);
    
    // Solo actualizar el booking si el source es 'booking' o null/undefined (retrocompatibilidad)
    // NO actualizar si el source es 'extension'
    const shouldUpdateBooking = commissionDetails.bookingId && 
                                (commissionDetails.source === 'booking' || 
                                 commissionDetails.source === null || 
                                 commissionDetails.source === undefined);
    
    if (shouldUpdateBooking) {
      try {
        // Actualizar directamente en la base de datos usando $unset para remover los campos
        await this.bookingRepository['bookingDB'].findByIdAndUpdate(
          commissionDetails.bookingId,
          { $unset: { concierge: '', commission: '' } }
        );
      } catch (error) {
        console.error(`Error updating booking ${commissionDetails.bookingId}:`, error);
        // No lanzamos el error para no fallar la eliminación de la comisión
      }
    }
  }

  async deleteByBookingNumberAndSource(bookingNumber: number, source: 'booking' | 'extension'): Promise<{ deletedCount: number }> {
    // Primero obtener las comisiones para saber qué bookings actualizar
    const commissions = await this.repository.findByBookingNumber(bookingNumber);
    const commissionsToDelete = commissions.filter(c => (c as any).source === source);
    
    // Obtener los booking IDs únicos
    const bookingIds = [...new Set(commissionsToDelete.map(c => (c as any).booking?.toString()).filter(Boolean))];
    
    // Eliminar las comisiones
    const deletedCount = await this.repository.deleteByBookingNumberAndSource(bookingNumber, source);
    
    // Solo actualizar los bookings si el source es 'booking' (no 'extension')
    if (source === 'booking') {
      for (const bookingId of bookingIds) {
        try {
          // Actualizar directamente en la base de datos usando $unset para remover los campos
          await this.bookingRepository['bookingDB'].findByIdAndUpdate(
            bookingId,
            { $unset: { concierge: '', commission: '' } }
          );
        } catch (error) {
          console.error(`Error updating booking ${bookingId}:`, error);
          // Continuamos con los demás bookings aunque uno falle
        }
      }
    }
    
    return { deletedCount };
  }
}
