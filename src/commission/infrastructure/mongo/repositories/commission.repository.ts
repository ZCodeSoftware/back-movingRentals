import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { CommissionModel } from '../../../domain/models/commission.model';
import { ICommissionRepository } from '../../../domain/repositories/commission.interface.repository';
import { CommissionSchema } from '../schemas/commission.schema';

@Injectable()
export class CommissionRepository implements ICommissionRepository {
  constructor(
    @InjectModel('Commission') private readonly commissionDB: Model<CommissionSchema>,
  ) {}

  async create(commission: CommissionModel): Promise<CommissionModel> {
    const schema = new this.commissionDB(commission.toJSON());
    const saved = await schema.save();
    if (!saved) throw new BaseErrorException(`Commission shouldn't be created`, HttpStatus.BAD_REQUEST);
    return CommissionModel.hydrate(saved);
  }

  async findAllByOwner(ownerId: string, filters: any = {}): Promise<{
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
    const query: any = {};
    
    // Filtro por vehicleOwner
    if (ownerId) query.vehicleOwner = new Types.ObjectId(String(ownerId));
    
    // Filtro por status
    if (filters.status) query.status = filters.status;
    
    // Filtro por bookingNumber
    if (filters.bookingNumber !== undefined && filters.bookingNumber !== null) {
      query.bookingNumber = filters.bookingNumber;
    }

    // Filtro: Solo comisiones con amount mayor a 0 (que tengan comisión asociada)
    query.amount = { $gt: 0 };
    
    // Filtro por vehicle (por nombre)
    let vehicleNameFilter = null;
    if (filters.vehicle) {
      vehicleNameFilter = filters.vehicle;
    }
    
    // Filtro por source (booking o extension)
    if (filters.source === 'booking') {
      // Si se especifica 'booking', buscar por ese valor o documentos sin el campo
      query.$or = [
        { source: 'booking' },
        { source: { $exists: false } }
      ];
    } else if (filters.source === 'extension') {
      // Si se especifica 'extension', buscar solo ese valor
      query.source = 'extension';
    }
    // Si no se envía source, no se filtra (trae todos)
    
    // Filtro por rango de fechas (createdAt)
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        // Asegurar que empiece desde las 00:00:00
        startDate.setUTCHours(0, 0, 0, 0);
        query.createdAt.$gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        // Agregar 23:59:59.999 al endDate para incluir todo el día
        endDate.setUTCHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;

    // Obtener el ID del estado "APROBADO" y "CANCELADO"
    const approvedStatus = await this.commissionDB.db.collection('cat_status').findOne({ name: 'APROBADO' });
    const cancelledStatus = await this.commissionDB.db.collection('cat_status').findOne({ name: 'CANCELADO' });
    
    if (!approvedStatus) {
      console.warn('Estado "APROBADO" no encontrado');
      return {
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Usar aggregation pipeline para filtrar por estado del booking O del contract
    const pipeline: any[] = [
      { $match: query },
      // Lookup para obtener el booking completo
      {
        $lookup: {
          from: 'booking',
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingData'
        }
      },
      // Unwind del booking
      {
        $unwind: {
          path: '$bookingData',
          preserveNullAndEmptyArrays: false
        }
      },
      // Lookup para obtener el contract asociado al booking
      {
        $lookup: {
          from: 'contracts',
          localField: 'booking',
          foreignField: 'booking',
          as: 'contractData'
        }
      },
      // Unwind del contract (puede no existir)
      {
        $unwind: {
          path: '$contractData',
          preserveNullAndEmptyArrays: true
        }
      },
      // Filtrar: booking APROBADO Y NO CANCELADO, O contract APROBADO Y NO CANCELADO
      {
        $match: {
          $and: [
            // El booking NO debe estar cancelado
            cancelledStatus ? { 'bookingData.status': { $ne: cancelledStatus._id } } : {},
            // Y debe cumplir: booking APROBADO O contract APROBADO
            {
              $or: [
                { 'bookingData.status': approvedStatus._id },
                { 'contractData.status': approvedStatus._id }
              ]
            }
          ]
        }
      }
    ];

    // Si hay filtro por nombre de vehículo, agregar lookup y filtro
    if (vehicleNameFilter) {
      pipeline.push(
        // Lookup para el campo vehicle (singular)
        {
          $lookup: {
            from: 'vehicle',
            localField: 'vehicle',
            foreignField: '_id',
            as: 'vehicleData'
          }
        },
        // Lookup para el campo vehicles (array)
        {
          $lookup: {
            from: 'vehicle',
            localField: 'vehicles',
            foreignField: '_id',
            as: 'vehiclesData'
          }
        },
        // Agregar un campo que combine ambos
        {
          $addFields: {
            allVehicles: {
              $concatArrays: [
                '$vehicleData',
                '$vehiclesData'
              ]
            }
          }
        },
        // Unwind para poder filtrar
        {
          $unwind: {
            path: '$allVehicles',
            preserveNullAndEmptyArrays: false
          }
        },
        // Filtrar por nombre
        {
          $match: {
            'allVehicles.name': { $regex: vehicleNameFilter, $options: 'i' }
          }
        }
      );
    }

    // Agregar sort
    pipeline.push({ $sort: { createdAt: -1 } });

    // Contar total de items
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.commissionDB.aggregate(countPipeline);
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;

    // Agregar paginación
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Ejecutar el pipeline
    const aggregateResult = await this.commissionDB.aggregate(pipeline);

    // Populate los campos restantes manualmente
    const list = await this.commissionDB.populate(aggregateResult, [
      { path: 'user' },
      { path: 'vehicleOwner' },
      { path: 'vehicle' },
      { path: 'vehicles' },
      { path: 'booking' }
    ]);

    // Obtener los contratos asociados a las reservas
    const bookingIds = list.map(doc => (doc.booking as any)?._id).filter(Boolean);
    const contracts = await this.commissionDB.db.collection('contracts').find({
      booking: { $in: bookingIds }
    }).toArray();

    // Obtener los contract IDs para buscar sus timelines
    const contractIds = contracts.map(c => c._id).filter(Boolean);
    
    // Obtener los timelines de los contratos
    const timelines = await this.commissionDB.db.collection('contract_history').find({
      contract: { $in: contractIds },
      isDeleted: { $ne: true }
    }).sort({ createdAt: 1 }).toArray();

    // Crear un mapa de contract -> timeline
    const timelineMap = new Map();
    timelines.forEach(timeline => {
      const contractId = timeline.contract.toString();
      if (!timelineMap.has(contractId)) {
        timelineMap.set(contractId, []);
      }
      timelineMap.get(contractId).push(timeline);
    });

    // Crear un mapa de booking -> contract para acceso rápido
    const contractMap = new Map();
    contracts.forEach(contract => {
      contractMap.set(contract.booking.toString(), {
        ...contract,
        timeline: timelineMap.get(contract._id.toString()) || []
      });
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data: list.map((doc) => {
        const contract = contractMap.get((doc.booking as any)?._id?.toString());
        
        // Agregar información del contrato al documento antes de hidratar
        const docWithContract = {
          ...doc,
          contract: contract ? {
            _id: contract._id,
            commission: contract.extension?.commissionPercentage || null,
            timeline: contract.timeline || []
          } : undefined
        };
        
        return CommissionModel.hydrate(docWithContract);
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findByBooking(bookingId: string): Promise<CommissionModel[]> {
    const list = await this.commissionDB
      .find({ booking: new Types.ObjectId(String(bookingId)) })
      .populate('user vehicleOwner vehicle vehicles booking')
      .sort({ createdAt: -1 }); // Ordenar de más nuevo a más viejo
    return list.map((doc) => CommissionModel.hydrate(doc));
  }

  async markAsPaid(id: string): Promise<CommissionModel> {
    const updated = await this.commissionDB.findByIdAndUpdate(id, { status: 'PAID' }, { new: true });
    if (!updated) throw new BaseErrorException('Commission not found', HttpStatus.NOT_FOUND);
    return CommissionModel.hydrate(updated);
  }

  async updateById(id: string, updates: Partial<{ amount: number; commissionPercentage: number }>): Promise<CommissionModel> {
    const updateData: any = {};
    
    if (updates.amount !== undefined) {
      updateData.amount = updates.amount;
    }
    
    if (updates.commissionPercentage !== undefined) {
      updateData.commissionPercentage = updates.commissionPercentage;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BaseErrorException('No valid fields to update', HttpStatus.BAD_REQUEST);
    }

    const updated = await this.commissionDB.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      throw new BaseErrorException('Commission not found', HttpStatus.NOT_FOUND);
    }

    console.log(`[CommissionRepository] Commission ${id} updated:`, updateData);
    return CommissionModel.hydrate(updated);
  }

  async findByBookingNumber(bookingNumber: number): Promise<CommissionModel[]> {
    const list = await this.commissionDB
      .find({ bookingNumber })
      .populate('user vehicleOwner vehicle vehicles')
      .sort({ createdAt: -1 });
    return list.map((doc) => CommissionModel.hydrate(doc));
  }

  async updateByBookingNumber(bookingNumber: number, updates: Partial<any>): Promise<CommissionModel[]> {
    // Buscar comisiones que sean de booking (o que no tengan source definido para retrocompatibilidad)
    const commissions = await this.commissionDB.find({ 
      bookingNumber,
      $or: [
        { source: 'booking' },
        { source: { $exists: false } }
      ]
    });
    
    if (!commissions || commissions.length === 0) {
      console.log(`No commissions found for booking number: ${bookingNumber}`);
      return [];
    }

    console.log(`Found ${commissions.length} commissions to update for booking number: ${bookingNumber}`);

    const updatedCommissions: CommissionModel[] = [];

    for (const commission of commissions) {
      const updateData: any = {};

      // Si hay cambio en vehicleOwner (concierge)
      if (updates.vehicleOwner !== undefined) {
        updateData.vehicleOwner = new Types.ObjectId(String(updates.vehicleOwner));
        console.log(`Updating vehicleOwner to: ${updates.vehicleOwner}`);
      }

      // Si hay cambio en amount (recalcular basado en nuevo porcentaje o monto)
      if (updates.amount !== undefined) {
        updateData.amount = updates.amount;
        console.log(`Updating amount to: ${updates.amount}`);
      }

      if (Object.keys(updateData).length > 0) {
        console.log(`Updating commission ${commission._id} with:`, updateData);
        
        const updated = await this.commissionDB.findByIdAndUpdate(
          commission._id,
          { $set: updateData },
          { new: true }
        ).populate('user vehicleOwner vehicle vehicles booking');

        if (updated) {
          console.log(`Commission ${commission._id} updated successfully`);
          updatedCommissions.push(CommissionModel.hydrate(updated));
        }
      }
    }

    console.log(`Updated ${updatedCommissions.length} commissions`);
    return updatedCommissions;
  }

  async deleteById(id: string): Promise<void> {
    const deleted = await this.commissionDB.findByIdAndDelete(id);
    if (!deleted) {
      throw new BaseErrorException('Commission not found', HttpStatus.NOT_FOUND);
    }
  }

  async deleteByBookingNumberAndSource(bookingNumber: number, source: 'booking' | 'extension'): Promise<number> {
    let query: any = { bookingNumber };
    
    if (source === 'booking') {
      // Si es 'booking', incluir también comisiones sin el campo source (retrocompatibilidad)
      query.$or = [
        { source: 'booking' },
        { source: { $exists: false } }
      ];
    } else if (source === 'extension') {
      // Si es 'extension', buscar solo ese valor específico
      query.source = 'extension';
    }
    
    const result = await this.commissionDB.deleteMany(query);
    return result.deletedCount || 0;
  }

  async getBookingIdByCommissionId(commissionId: string): Promise<string | null> {
    const commission = await this.commissionDB.findById(commissionId).select('booking').lean();
    return commission?.booking?.toString() || null;
  }

  async getCommissionDetailsById(commissionId: string): Promise<{ bookingId: string | null; source: string | null }> {
    const commission = await this.commissionDB.findById(commissionId).select('booking source').lean();
    return {
      bookingId: commission?.booking?.toString() || null,
      source: commission?.source || null,
    };
  }
}
