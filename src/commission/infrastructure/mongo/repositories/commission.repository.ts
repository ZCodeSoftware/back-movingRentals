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
    
    // Filtro por vehicle (por nombre)
    // Este filtro se aplicará después del populate, por lo que necesitamos un enfoque diferente
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

    let list;
    let totalItems;

    // Si hay filtro por nombre de vehículo, usar aggregation pipeline
    if (vehicleNameFilter) {
      const pipeline: any[] = [
        { $match: query },
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
        },
        { $sort: { createdAt: -1 } }
      ];

      // Contar total de items con el filtro de vehículo
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this.commissionDB.aggregate(countPipeline);
      totalItems = countResult.length > 0 ? countResult[0].total : 0;

      // Agregar paginación
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Ejecutar el pipeline
      const aggregateResult = await this.commissionDB.aggregate(pipeline);

      // Populate los campos restantes manualmente
      list = await this.commissionDB.populate(aggregateResult, [
        { path: 'user' },
        { path: 'vehicleOwner' },
        { path: 'vehicle' },
        { path: 'vehicles' },
        { path: 'booking' }
      ]);
    } else {
      // Sin filtro de vehículo, usar el método normal
      totalItems = await this.commissionDB.countDocuments(query);
      list = await this.commissionDB
        .find(query)
        .populate('user vehicleOwner vehicle vehicles booking')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    // Obtener los contratos asociados a las reservas
    const bookingIds = list.map(doc => (doc.booking as any)?._id).filter(Boolean);
    const contracts = await this.commissionDB.db.collection('contracts').find({
      booking: { $in: bookingIds }
    }).toArray();

    // Crear un mapa de booking -> contract para acceso rápido
    const contractMap = new Map();
    contracts.forEach(contract => {
      contractMap.set(contract.booking.toString(), contract);
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data: list.map((doc) => {
        const hydrated = CommissionModel.hydrate(doc);
        const contract = contractMap.get((doc.booking as any)?._id?.toString());
        
        // Agregar información del contrato al objeto hidratado
        if (contract) {
          (hydrated as any).contract = {
            commission: contract.extension?.commissionPercentage || null
          };
        }
        
        return hydrated;
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

  async findByBookingNumber(bookingNumber: number): Promise<CommissionModel[]> {
    const list = await this.commissionDB
      .find({ bookingNumber })
      .populate('user vehicleOwner vehicle vehicles booking')
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
}
