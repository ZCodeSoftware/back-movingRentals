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

  async update(id: string, updates: Partial<{ amount: number; commissionPercentage: number }>): Promise<CommissionModel> {
    return this.repository.updateById(id, updates);
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
        // Remover los campos concierge y commission del booking
        await this.bookingRepository.removeFields(commissionDetails.bookingId, ['concierge', 'commission']);
      } catch (error) {
        console.error(`Error updating booking ${commissionDetails.bookingId}:`, error);
        // No lanzamos el error para no fallar la eliminación de la comisión
      }
    }
  }

  async deleteByBookingNumberAndSource(bookingNumber: number, source: 'booking' | 'extension'): Promise<{ deletedCount: number }> {
    console.log(`[deleteByBookingNumberAndSource] Starting deletion for booking ${bookingNumber}, source: ${source}`);
    
    // Primero obtener las comisiones para saber qué bookings actualizar
    const commissions = await this.repository.findByBookingNumber(bookingNumber);
    console.log(`[deleteByBookingNumberAndSource] Found ${commissions.length} total commissions`);
    
    const commissionsToDelete = commissions.filter(c => {
      const commissionSource = (c as any).source;
      const matches = commissionSource === source || (!commissionSource && source === 'booking');
      console.log(`[deleteByBookingNumberAndSource] Commission ${(c as any)._id}, source: ${commissionSource}, matches: ${matches}`);
      return matches;
    });
    
    console.log(`[deleteByBookingNumberAndSource] ${commissionsToDelete.length} commissions match the source filter`);
    
    // Obtener los booking IDs únicos
    const bookingIds = [...new Set(commissionsToDelete.map(c => {
      const commission = c as any;
      let bookingId: string | null = null;
      
      // Intentar obtener el booking desde toJSON()
      if (typeof commission.toJSON === 'function') {
        const jsonData = commission.toJSON();
        const booking = jsonData.booking;
        
        // Si booking es un string directo (ObjectId como string)
        if (typeof booking === 'string' && /^[0-9a-fA-F]{24}$/.test(booking)) {
          bookingId = booking;
        }
        // Si booking es un objeto con _id (caso populate), extraer solo el _id
        else if (booking && typeof booking === 'object' && booking._id) {
          bookingId = typeof booking._id === 'string' ? booking._id : booking._id.toString();
        }
      }
      
      // Fallback: acceder directamente a la propiedad privada
      if (!bookingId && commission._booking) {
        if (typeof commission._booking === 'string' && /^[0-9a-fA-F]{24}$/.test(commission._booking)) {
          bookingId = commission._booking;
        } else if (typeof commission._booking === 'object') {
          bookingId = commission._booking._id ? commission._booking._id.toString() : commission._booking.toString();
        }
      }
      
      console.log(`[deleteByBookingNumberAndSource] Extracted booking ID:`, bookingId);
      return bookingId;
    }).filter(Boolean) as string[])];
    console.log(`[deleteByBookingNumberAndSource] Final booking IDs array:`, bookingIds);
    console.log(`[deleteByBookingNumberAndSource] First booking ID:`, bookingIds[0]);
    console.log(`[deleteByBookingNumberAndSource] First booking ID type:`, typeof bookingIds[0]);
    
    // Eliminar las comisiones
    const deletedCount = await this.repository.deleteByBookingNumberAndSource(bookingNumber, source);
    console.log(`[deleteByBookingNumberAndSource] Deleted ${deletedCount} commissions`);
    
    // Solo actualizar los bookings si el source es 'booking' (no 'extension')
    if (source === 'booking') {
      console.log(`[deleteByBookingNumberAndSource] Updating ${bookingIds.length} bookings`);
      for (const bookingId of bookingIds) {
        try {
          console.log(`[deleteByBookingNumberAndSource] Removing fields from booking ${bookingId}`);
          // Remover los campos concierge y commission del booking
          await this.bookingRepository.removeFields(bookingId, ['concierge', 'commission']);
          console.log(`[deleteByBookingNumberAndSource] Successfully updated booking ${bookingId}`);
        } catch (error) {
          console.error(`[deleteByBookingNumberAndSource] Error updating booking ${bookingId}:`, error);
          // Continuamos con los demás bookings aunque uno falle
        }
      }
    } else {
      console.log(`[deleteByBookingNumberAndSource] Skipping booking update because source is '${source}'`);
    }
    
    return { deletedCount };
  }
}
