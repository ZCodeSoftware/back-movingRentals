import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import { CatContractEvent } from '../../../../core/infrastructure/mongo/schemas/catalogs/cat-contract-event.schema';
import { Booking } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { CartVersion } from '../../../../core/infrastructure/mongo/schemas/public/cart-version.version';
import { Cart } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import {
  ContractAction,
  ContractHistory,
} from '../../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { Contract } from '../../../../core/infrastructure/mongo/schemas/public/contract.schema';
import {
  Reservation,
  Vehicle,
} from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';
import { ContractModel } from '../../../domain/models/contract.model';
import {
  IContractFilters,
  IContractRepository,
  IPaginatedContractResponse,
} from '../../../domain/repositories/contract.interface.repository';
import { UpdateContractDTO } from '../../nest/dtos/contract.dto';

interface CartVehicleItem {
  vehicle: string | { _id: string };
  dates: {
    start: string | Date;
    end: string | Date;
  };
}

interface CartWithVehicles {
  vehicles: CartVehicleItem[];
}

interface ReservationWithId extends Reservation {
  _id: mongoose.Types.ObjectId;
}

@Injectable()
export class ContractRepository implements IContractRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(Contract.name) private readonly contractModel: Model<Contract>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(CartVersion.name)
    private readonly cartVersionModel: Model<CartVersion>,
    @InjectModel(ContractHistory.name)
    private readonly contractHistoryModel: Model<ContractHistory>,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<Vehicle>,
    @InjectModel(CatContractEvent.name)
    private readonly catContractEventModel: Model<CatContractEvent>,
  ) {}

  async create(
    contract: ContractModel,
    userId: string,
  ): Promise<ContractModel> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const contractData = {
        booking: contract.booking?.id?.toValue() || contract.booking,
        reservingUser:
          contract.reservingUser?.id?.toValue() || contract.reservingUser,
        createdByUser: userId,
        status: contract.status?.id?.toValue() || contract.status,
        extension: contract.extension,
        concierge: contract.concierge?.id?.toValue() || contract.concierge,
        source: contract.source,
      };

      const createdContract = new this.contractModel(contractData);
      const savedContract = await createdContract.save({ session });

      // Obtener información del usuario para createdBy
      const userInfo = await this.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
      
      const createdByValue = userInfo 
        ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
        : 'Usuario desconocido';
      


      const historyEntry = new this.contractHistoryModel({
        contract: savedContract._id,
        performedBy: userId,
        action: ContractAction.CONTRACT_CREATED,
        details: 'El contrato fue creado.',
        createdBy: createdByValue,
      });
      await historyEntry.save({ session });

      // Verificar si el booking tiene delivery y crear el movimiento correspondiente
      const bookingId = contractData.booking;
      const booking = await this.bookingModel.findById(bookingId).session(session);
      
      if (booking && booking.requiresDelivery && booking.deliveryCost && booking.deliveryCost > 0) {
        console.log('[ContractRepository][create] Booking tiene delivery - Creando movimiento de DELIVERY');
        
        try {
          // Obtener información del carrito para el vehículo
          let vehicleId = null;
          let concierge = null;
          
          if (booking.cart) {
            const cartData = JSON.parse(booking.cart);
            if (cartData.vehicles && cartData.vehicles.length > 0) {
              vehicleId = cartData.vehicles[0].vehicle?._id || cartData.vehicles[0].vehicle;
            }
          }
          
          // Obtener el concierge del booking si existe
          if (booking.concierge) {
            concierge = booking.concierge;
          }
          
          // Buscar el evento de DELIVERY en el catálogo
          const deliveryEvent = await this.catContractEventModel.findOne({ name: 'DELIVERY' });
          
          // Crear el movimiento de delivery enlazado al histórico
          const deliveryMetadata = {
            amount: booking.deliveryCost,
            paymentMethod: 'CUENTA', // Método de pago por defecto para delivery
            vehicle: vehicleId,
            beneficiary: concierge,
            date: new Date(),
            deliveryType: booking.deliveryType,
            oneWayType: booking.oneWayType,
            deliveryAddress: booking.deliveryAddress,
          };
          
          const deliveryHistoryEntry = new this.contractHistoryModel({
            contract: savedContract._id,
            performedBy: userId,
            action: ContractAction.NOTE_ADDED,
            eventType: deliveryEvent?._id,
            details: `Servicio de delivery - ${booking.deliveryType === 'round-trip' ? 'Ida y vuelta' : booking.oneWayType === 'pickup' ? 'Solo recogida' : 'Solo entrega'}`,
            eventMetadata: deliveryMetadata,
            createdBy: createdByValue,
          });
          
          await deliveryHistoryEntry.save({ session });
          
          console.log('[ContractRepository][create] Movimiento de DELIVERY creado exitosamente');
        } catch (deliveryError) {
          console.error('[ContractRepository][create] Error al crear movimiento de DELIVERY:', deliveryError);
          // No fallar la creación del contrato si falla el movimiento de delivery
        }
      }

      await session.commitTransaction();

      await savedContract.populate([
        { path: 'booking' },
        { path: 'reservingUser' },
        { path: 'createdByUser' },
        { path: 'status' },
        { path: 'extension.paymentMethod' },
        { path: 'extension.extensionStatus' },
      ]);

      return ContractModel.hydrate(savedContract.toObject());
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // --- REFACTORIZADO ---
  async applyBookingChangesFromExtension(
    contractId: string,
    newCartObject: Cart,
    userId: string,
    details: string,
    existingSession: mongoose.ClientSession,
    fullUpdateData?: any, // Nuevo parámetro para snapshot de toda la data
  ): Promise<void> {
    // Esta función ahora ASUME que siempre recibe una sesión y opera dentro de ella
    // sin iniciar, confirmar o abortar la transacción.

    
    const contract = await this.contractModel
      .findById(contractId)
      .session(existingSession);
    if (!contract) {
      throw new NotFoundException('Contrato no encontrado.');
    }

    const booking = await this.bookingModel
      .findById(contract.booking)
      .session(existingSession);
    if (!booking) {
      throw new NotFoundException('Reserva asociada no encontrada.');
    }

    const lastVersion = await this.cartVersionModel
      .findOne({ booking: booking._id })
      .sort({ version: -1 })
      .session(existingSession);
    const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

    // Obtener el carrito anterior como snapshot
    let oldCartSnapshot = undefined;
    if (booking.cart) {
      try {
        oldCartSnapshot = JSON.parse(booking.cart);
      } catch (err) {

      }
    }

    const newCartVersion = new this.cartVersionModel({
      booking: booking._id,
      version: newVersionNumber,
      data: newCartObject,
    });

    // --- DIFF DETECTION BEGIN ---
    let autoDetails = [];
    function safeId(val) {
      if (!val) return undefined;
      return typeof val === 'string' ? val : val._id || val.id || JSON.stringify(val);
    }
    function arrayDiff(oldArr, newArr, byField) {
      const oldMap = new Map((oldArr||[]).map(v => [byField(v), v]));
      const newMap = new Map((newArr||[]).map(v => [byField(v), v]));
      const added = [];
      const removed = [];
      const updated = [];
      for(const [id, v] of oldMap) if (!newMap.has(id)) removed.push(v);
      for(const [id, v] of newMap) if (!oldMap.has(id)) added.push(v);
      for(const [id, v] of newMap) if (oldMap.has(id)) updated.push([oldMap.get(id), v]);
      return {added, removed, updated};
    }
    // VEHICLES
    const oldVehs = oldCartSnapshot?.vehicles || [];
    const newVehs = newCartObject?.vehicles || [];
    const difVehs = arrayDiff(oldVehs, newVehs, v => safeId(v.vehicle));

    // Colectar todos los vehicle IDs usados en cualquier diff
    const vehicleIdsSet = new Set();
    difVehs.removed.forEach(v => vehicleIdsSet.add(safeId(v.vehicle)));
    difVehs.added.forEach(v => vehicleIdsSet.add(safeId(v.vehicle)));
    difVehs.updated.forEach(([ov, nv]) => { vehicleIdsSet.add(safeId(ov.vehicle)); vehicleIdsSet.add(safeId(nv.vehicle)); });
    // Hacer el populate/nombres
    let vehicleNameMap = {};
    if(vehicleIdsSet.size > 0) {
      const vehiclesFound = await this.vehicleModel.find({ _id: { $in: Array.from(vehicleIdsSet) } }, 'name _id').lean();
      vehiclesFound.forEach(v => { vehicleNameMap[v._id.toString()] = v.name || v._id.toString(); });
    }
    function vehLabel(id) {
      return vehicleNameMap[id] || id;
    }
    if(difVehs.removed.length) autoDetails.push(`Quitado(s) vehículo(s) ${difVehs.removed.map(v => vehLabel(safeId(v.vehicle))).join(', ')}`);
    if(difVehs.added.length) autoDetails.push(`Agregado(s) veh��culo(s) ${difVehs.added.map(v => vehLabel(safeId(v.vehicle))).join(', ')}`);
    difVehs.updated.forEach(([ov, nv]) => {
      const cambios = [];
      if(ov.dates?.start !== nv.dates?.start) cambios.push(`fecha inicio: ${ov.dates?.start} → ${nv.dates?.start}`);
      if(ov.dates?.end !== nv.dates?.end) cambios.push(`fecha fin: ${ov.dates?.end} → ${nv.dates?.end}`);
      if((ov.total||0)!==(nv.total||0)) cambios.push(`importe: ${ov.total} → ${nv.total}`);
      // Más campos si es necesario
      if(ov.passengers?.adults!==nv.passengers?.adults) cambios.push(`adultos: ${ov.passengers?.adults} → ${nv.passengers?.adults}`);
      if(ov.passengers?.child!==nv.passengers?.child) cambios.push(`menores: ${ov.passengers?.child} → ${nv.passengers?.child}`);
      if(cambios.length) autoDetails.push(`Vehículo ${vehLabel(safeId(nv.vehicle))} modificado: ${cambios.join(', ')}`);
    });
    // TOURS
    const difTours = arrayDiff(
      oldCartSnapshot?.tours, newCartObject?.tours, v=>safeId(v.tour||v.id||v)
    );
    if(difTours.removed.length) autoDetails.push(`Quitado(s) tour(s): ${difTours.removed.map(v=>safeId(v.tour||v.id||v)).join(', ')}`);
    if(difTours.added.length) autoDetails.push(`Agregado(s) tour(s): ${difTours.added.map(v=>safeId(v.tour||v.id||v)).join(', ')}`);
    // TICKETS
    const difTickets = arrayDiff(
      oldCartSnapshot?.tickets, newCartObject?.tickets, v=>safeId(v.ticket||v.id||v)
    );
    if(difTickets.removed.length) autoDetails.push(`Quitado(s) ticket(s): ${difTickets.removed.map(v=>safeId(v.ticket||v.id||v)).join(', ')}`);
    if(difTickets.added.length) autoDetails.push(`Agregado(s) ticket(s): ${difTickets.added.map(v=>safeId(v.ticket||v.id||v)).join(', ')}`);
    // TRANSFER
    const difTransfer = arrayDiff(
      oldCartSnapshot?.transfer, newCartObject?.transfer, v=>safeId(v.transfer||v.id||v)
    );
    if(difTransfer.removed.length) autoDetails.push(`Quitado(s) transfer(s): ${difTransfer.removed.map(v=>safeId(v.transfer||v.id||v)).join(', ')}`);
    if(difTransfer.added.length) autoDetails.push(`Agregado(s) transfer(s): ${difTransfer.added.map(v=>safeId(v.transfer||v.id||v)).join(', ')}`);
    // Combine detalles auto + details manual/user + reasonForChange (del fullUpdateData)
    let combinedDetails = '';
    if(autoDetails.length) combinedDetails += autoDetails.join('. ') + '.';
    // Si el usuario mandó reasonForChange por fullUpdateData, agregarlo al final
    const userDetailsFromUpdate = typeof fullUpdateData?.reasonForChange === 'string' ? fullUpdateData.reasonForChange : '';
    // User details puede estar como details, si no, sumar reasonForChange
    if(details) combinedDetails += ' ' + details;
    else if(userDetailsFromUpdate) combinedDetails += ' ' + userDetailsFromUpdate;
    combinedDetails = combinedDetails.trim();
    // --- DIFF DETECTION END ---

    const changesPayload = {
      field: 'activeCartVersion',
      oldValue: booking.activeCartVersion,
      newValue: newCartVersion._id,
      cartSnapshot: newCartObject,
      oldCartSnapshot, // SNapshot del carrito anterior
      eventSnapshot: fullUpdateData ? { ...fullUpdateData } : undefined
    };

    // Obtener información del usuario para createdBy
    const userInfo = await this.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    const createdByValue = userInfo 
      ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
      : 'Usuario desconocido';
    


    const historyEntry = new this.contractHistoryModel({
      contract: contract._id,
      performedBy: userId,
      action: ContractAction.BOOKING_MODIFIED,
      changes: [changesPayload],
      details: combinedDetails,
      createdBy: createdByValue,
    });
    await historyEntry.save({ session: existingSession });

    newCartVersion.createdByEvent = historyEntry._id;
    await newCartVersion.save({ session: existingSession });

    booking.activeCartVersion = newCartVersion._id;
    booking.cart = JSON.stringify(newCartObject);

    await booking.save({ session: existingSession });
  }

  async getTimelineForContract(contractId: string): Promise<ContractHistory[]> {
    // Incluir movimientos eliminados en el timeline para que el frontend los muestre tachados
    return this.contractHistoryModel
      .find({ contract: contractId })
      .setOptions({ includeDeleted: true }) // Esto desactiva el middleware que filtra eliminados
      .sort({ createdAt: 'asc' })
      .populate('performedBy', 'name lastName email')
      .populate('deletedBy', 'name lastName email') // Poblar también deletedBy para tener info completa
      .populate('eventType')
      .exec();
  }

  async findById(id: string): Promise<ContractModel> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`El ID del contrato "${id}" no es válido.`);
    }

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: 'contract_history',
          localField: '_id',
          foreignField: 'contract',
          as: 'timeline',
          pipeline: [
            // NO filtrar por isDeleted para incluir movimientos eliminados
            { $sort: { createdAt: 1 } },
            {
              $lookup: {
                from: 'users',
                localField: 'performedBy',
                foreignField: 'id',
                as: 'performedBy',
              },
            },
            {
              $unwind: {
                path: '$performedBy',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'deletedBy',
                foreignField: '_id',
                as: 'deletedBy',
              },
            },
            {
              $unwind: {
                path: '$deletedBy',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'cat_contract_event',
                localField: 'eventType',
                foreignField: '_id',
                as: 'eventType',
              },
            },
            {
              $unwind: {
                path: '$eventType',
                preserveNullAndEmptyArrays: true,
              },
            },
            { 
              $project: { 
                'performedBy.password': 0, 
                'performedBy.role': 0,
                'deletedBy.password': 0,
                'deletedBy.role': 0
              } 
            },
            {
              $addFields: {
                // Si createdBy ya existe en el documento, usarlo; si no, calcularlo
                createdBy: {
                  $cond: {
                    if: { $ne: [{ $ifNull: ['$createdBy', null] }, null] },
                    then: '$createdBy',
                    else: {
                      $cond: {
                        if: { $ifNull: ['$performedBy', false] },
                        then: {
                          $cond: {
                            if: {
                              $or: [
                                { $ne: [{ $ifNull: ['$performedBy.name', ''] }, ''] },
                                { $ne: [{ $ifNull: ['$performedBy.lastName', ''] }, ''] }
                              ]
                            },
                            then: {
                              $concat: [
                                { $trim: { input: { $concat: [
                                  { $ifNull: ['$performedBy.name', ''] },
                                  ' ',
                                  { $ifNull: ['$performedBy.lastName', ''] }
                                ] } } },
                                {
                                  $cond: {
                                    if: { $ne: [{ $ifNull: ['$performedBy.email', ''] }, ''] },
                                    then: { $concat: [' - ', '$performedBy.email'] },
                                    else: ''
                                  }
                                }
                              ]
                            },
                            else: {
                              $cond: {
                                if: { $ne: [{ $ifNull: ['$performedBy.email', ''] }, ''] },
                                then: '$performedBy.email',
                                else: 'Usuario desconocido'
                              }
                            }
                          }
                        },
                        else: 'Usuario desconocido'
                      }
                    }
                  }
                }
              }
            }
          ],
        },
      },
      {
        $lookup: {
          from: 'booking',
          localField: 'booking',
          foreignField: '_id',
          as: 'booking',
          pipeline: [
            {
              $lookup: {
                from: 'vehicle_owner',
                localField: 'concierge',
                foreignField: '_id',
                as: 'concierge',
              },
            },
            {
              $unwind: {
                path: '$concierge',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reservingUser',
          foreignField: '_id',
          as: 'reservingUser',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdByUser',
          foreignField: '_id',
          as: 'createdByUser',
        },
      },
      {
        $lookup: {
          from: 'cat_status',
          localField: 'status',
          foreignField: '_id',
          as: 'status',
        },
      },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$reservingUser', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$createdByUser', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$status', preserveNullAndEmptyArrays: true } },
    ];

    const result = await this.contractModel.aggregate(pipeline);

    if (result.length === 0) {
      throw new NotFoundException(`Contrato con ID "${id}" no encontrado.`);
    }

    const contractWithHistory = result[0];

    return ContractModel.hydrate(contractWithHistory);
  }

  async findAll(
    filters: IContractFilters,
  ): Promise<IPaginatedContractResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const escapeRegex = (text: string) => {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    };

    const pipeline: any[] = [];
    pipeline.push({
      $lookup: {
        from: 'booking',
        localField: 'booking',
        foreignField: '_id',
        as: 'bookingData',
        pipeline: [
          {
            $lookup: {
              from: 'vehicle_owner',
              localField: 'concierge',
              foreignField: '_id',
              as: 'concierge',
            },
          },
          {
            $unwind: {
              path: '$concierge',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    });
    pipeline.push({
      $unwind: '$bookingData',
    });
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'reservingUser',
        foreignField: '_id',
        as: 'reservingUserData',
        pipeline: [
          // Incluir usuarios eliminados - no filtrar por isDeleted
          {
            $project: {
              name: 1,
              lastName: 1,
              email: 1,
              role: 1,
              cellphone: 1,
              documentation: 1,
              isActive: 1,
              newsletter: 1,
              cart: 1,
              address: 1,
              isDeleted: 1, // Incluir el campo isDeleted para saber si está eliminado
            }
          }
        ]
      },
    });
    pipeline.push({
      $unwind: {
        path: '$reservingUserData',
        preserveNullAndEmptyArrays: true,
      },
    });
    const matchConditions: any = {};
    if (filters.bookingNumber) {
      matchConditions['bookingData.bookingNumber'] = filters.bookingNumber;
    }
    if (filters.status) {
      matchConditions['bookingData.status'] = new mongoose.Types.ObjectId(filters.status);
    }
    if (filters.isReserve !== undefined) {
      matchConditions['bookingData.isReserve'] = filters.isReserve === 'true' || filters.isReserve === true;
    }
    if (filters.reservingUser) {
      // Detectar si es un ObjectId válido o un email/texto
      if (mongoose.Types.ObjectId.isValid(filters.reservingUser)) {
        matchConditions['reservingUser'] = new mongoose.Types.ObjectId(filters.reservingUser);
      } else {
        const regex = new RegExp(escapeRegex(filters.reservingUser), 'i');
        matchConditions['reservingUserData.email'] = regex;
      }
    }
    if (filters.search) {
      const regex = new RegExp(escapeRegex(filters.search), 'i');
      matchConditions.$or = [
        { 'reservingUserData.email': regex },
        { 'reservingUserData.name': regex },
        { 'reservingUserData.lastName': regex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$reservingUserData.name', ' ', '$reservingUserData.lastName'] },
              regex: escapeRegex(filters.search),
              options: 'i',
            },
          },
        },
      ];
    }
    if (filters.createdByUser) {
      // Detectar si es un ObjectId válido o un email/texto
      if (mongoose.Types.ObjectId.isValid(filters.createdByUser)) {
        matchConditions.createdByUser = new mongoose.Types.ObjectId(
          filters.createdByUser,
        );
      } else {
        // Si no es un ObjectId, necesitamos hacer lookup del usuario por email
        // Primero agregamos el lookup de createdByUser si no existe
        const hasCreatedByUserLookup = pipeline.some(
          (stage: any) => stage.$lookup?.as === 'createdByUserData'
        );
        
        if (!hasCreatedByUserLookup) {
          pipeline.push({
            $lookup: {
              from: 'users',
              localField: 'createdByUser',
              foreignField: '_id',
              as: 'createdByUserData',
              pipeline: [
                // Incluir usuarios eliminados - no filtrar por isDeleted
                {
                  $project: {
                    name: 1,
                    lastName: 1,
                    email: 1,
                    role: 1,
                    cellphone: 1,
                    documentation: 1,
                    isActive: 1,
                    newsletter: 1,
                    cart: 1,
                    address: 1,
                    isDeleted: 1, // Incluir el campo isDeleted para saber si está eliminado
                  }
                }
              ]
            },
          });
          pipeline.push({
            $unwind: {
              path: '$createdByUserData',
              preserveNullAndEmptyArrays: true,
            },
          });
        }
        
        const regex = new RegExp(escapeRegex(filters.createdByUser), 'i');
        matchConditions['createdByUserData.email'] = regex;
      }
    }
    if (filters.service) {
      // The booking.cart is stored as a JSON string; build specific regexes for service names inside vehicle/tour/ticket/transfer entries
      const escaped = escapeRegex(filters.service);
      const vehiclesRegex = new RegExp(`\"vehicles\"\\s*:\\s*\\[.*?\"vehicle\"\\s*:\\s*\\{.*?\"name\"\\s*:\\s*\"[^\\\"]*${escaped}[^\\\"]*\"`, 'i');
      const toursRegex = new RegExp(`\"tours\"\\s*:\\s*\\[.*?\"tour\"\\s*:\\s*\\{.*?\"name\"\\s*:\\s*\"[^\\\"]*${escaped}[^\\\"]*\"`, 'i');
      const ticketsRegex = new RegExp(`\"tickets\"\\s*:\\s*\\[.*?\"ticket\"\\s*:\\s*\\{.*?\"name\"\\s*:\\s*\"[^\\\"]*${escaped}[^\\\"]*\"`, 'i');
      const transferRegex = new RegExp(`\"transfer\"\\s*:\\s*\\[.*?\"transfer\"\\s*:\\s*\\{.*?\"name\"\\s*:\\s*\"[^\\\"]*${escaped}[^\\\"]*\"`, 'i');

      const orConditions = [
        { 'bookingData.cart': { $regex: vehiclesRegex } },
        { 'bookingData.cart': { $regex: toursRegex } },
        { 'bookingData.cart': { $regex: ticketsRegex } },
        { 'bookingData.cart': { $regex: transferRegex } },
      ];

      pipeline.push({ $match: { $or: orConditions } });
    }
    
    // Filtro por fecha de creación del contrato
    if (filters.createdAtStart || filters.createdAtEnd) {
      const createdAtMatch: any = {};
      if (filters.createdAtStart) {
        const startDate = new Date(filters.createdAtStart);
        startDate.setUTCHours(0, 0, 0, 0);
        createdAtMatch.$gte = startDate;
      }
      if (filters.createdAtEnd) {
        const endDate = new Date(filters.createdAtEnd);
        endDate.setUTCHours(23, 59, 59, 999);
        createdAtMatch.$lte = endDate;
      }
      matchConditions.createdAt = createdAtMatch;
    }
    
    // Filtro por fecha de reserva (solo fecha de inicio del vehículo)
    // Siempre comparamos con la fecha de inicio de la reserva, no con la finalización
    if (filters.reservationDateStart || filters.reservationDateEnd) {
      // Construir las condiciones de filtro usando regex en el cart JSON
      const dateConditions: any[] = [];
      
      if (filters.reservationDateStart && filters.reservationDateEnd) {
        // Si se proporcionan ambas fechas, filtrar por rango (desde-hasta)
        const startDate = new Date(filters.reservationDateStart);
        const endDate = new Date(filters.reservationDateEnd);
        
        // Crear un array de todas las fechas en el rango
        const dateRange: string[] = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          dateRange.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Crear regex que busque cualquiera de las fechas en el rango en la fecha de inicio
        const datePattern = dateRange.join('|');
        const startRegex = new RegExp(`"vehicles"[^\\]]*"dates"[^}]*"start"\\s*:\\s*"(${datePattern})`, 'i');
        
        dateConditions.push({ 'bookingData.cart': { $regex: startRegex } });
      } else if (filters.reservationDateStart) {
        // Si solo se proporciona fecha de inicio, buscar esa fecha exacta
        const startDate = new Date(filters.reservationDateStart);
        const dateStr = startDate.toISOString().split('T')[0];
        const startRegex = new RegExp(`"vehicles"[^\\]]*"dates"[^}]*"start"\\s*:\\s*"${dateStr}`, 'i');
        
        dateConditions.push({ 'bookingData.cart': { $regex: startRegex } });
      } else if (filters.reservationDateEnd) {
        // Si solo se proporciona fecha de fin, buscar esa fecha exacta
        const endDate = new Date(filters.reservationDateEnd);
        const dateStr = endDate.toISOString().split('T')[0];
        const startRegex = new RegExp(`"vehicles"[^\\]]*"dates"[^}]*"start"\\s*:\\s*"${dateStr}`, 'i');
        
        dateConditions.push({ 'bookingData.cart': { $regex: startRegex } });
      }
      
      if (dateConditions.length > 0) {
        pipeline.push({ $match: { $or: dateConditions } });
      }
    }
    
    // Filtro por método de pago
    if (filters.paymentMethod) {
      matchConditions['bookingData.paymentMethod'] = new mongoose.Types.ObjectId(filters.paymentMethod);
    }
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }
    
    // Agregar lookup del timeline para poder calcular isExtended
    pipeline.push({
      $lookup: {
        from: 'contract_history',
        localField: '_id',
        foreignField: 'contract',
        as: 'timeline',
        pipeline: [
          // NO filtrar por isDeleted - incluir todas las entradas para que el frontend las muestre
          { $sort: { createdAt: 1 } },
          {
            $lookup: {
              from: 'cat_contract_event',
              localField: 'eventType',
              foreignField: '_id',
              as: 'eventType',
            },
          },
          {
            $unwind: {
              path: '$eventType',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Solo incluir campos necesarios para reducir el tamaño de la respuesta
          {
            $project: {
              action: 1,
              'eventType._id': 1,
              'eventType.name': 1,
              isDeleted: 1,
              eventMetadata: 1,
              createdAt: 1,
              details: 1,
              changes: 1,
            }
          }
        ],
      },
    });
    
    pipeline.push({ $sort: { createdAt: -1 } });
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.contractModel
      .aggregate(countPipeline)
      .exec();
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    const aggregationResult = await this.contractModel
      .aggregate(pipeline)
      .exec();
    
    // Mapear los datos de usuario desde el aggregation pipeline
    const contracts = aggregationResult.map(contract => {
      // Asignar reservingUser desde reservingUserData si existe
      if (contract.reservingUserData) {
        contract.reservingUser = contract.reservingUserData;
        delete contract.reservingUserData;
      }
      
      // Asignar createdByUser desde createdByUserData si existe
      if (contract.createdByUserData) {
        contract.createdByUser = contract.createdByUserData;
        delete contract.createdByUserData;
      }
      
      // Asignar booking desde bookingData
      if (contract.bookingData) {
        contract.booking = contract.bookingData;
        delete contract.bookingData;
      }
      
      return contract;
    });
    
    // Populate solo los campos que no son usuarios (para evitar el middleware de soft delete)
    const populatedContracts = await this.contractModel.populate(contracts, [
      { path: 'status' },
      { path: 'extension.paymentMethod' },
      { path: 'extension.extensionStatus' },
    ]);
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const contractModels = contracts.map((contract) => {
      // Convertir el documento de Mongoose a objeto plano antes de hidratar
      const plainContract = contract.toObject ? contract.toObject() : contract;
      return ContractModel.hydrate(plainContract);
    });
    return {
      data: contractModels,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async update(
    id: string,
    contractData: UpdateContractDTO,
    userId: string,
  ): Promise<ContractModel> {
    const session = await this.connection.startSession();
    session.startTransaction();

    let updatedContract;

    try {
      const originalContract = await this.contractModel
        .findById(id)
        .session(session);
      if (!originalContract) {
        throw new NotFoundException('Contract not found');
      }

      const { newCart, reasonForChange, ...contractUpdateData } = contractData;
      const changesToLog = [];

      // Obtener el booking completo para detectar cambios en el carrito
      const bookingBeforeUpdate = await this.bookingModel
        .findById(originalContract.booking)
        .session(session)
        .lean();

      if (
        contractUpdateData.status &&
        originalContract.status.toString() !== contractUpdateData.status
      ) {
        changesToLog.push({
          field: 'status',
          oldValue: originalContract.status,
          newValue: contractUpdateData.status,
        });
      }
      if (
        contractUpdateData.reservingUser &&
        originalContract.reservingUser.toString() !==
          contractUpdateData.reservingUser
      ) {
        changesToLog.push({
          field: 'reservingUser',
          oldValue: originalContract.reservingUser,
          newValue: contractUpdateData.reservingUser,
        });
      }
      if (contractUpdateData.extension) {
        // Desglosar y guardar explicitamente extensionAmount y commissionPercentage
        const { extensionAmount, commissionPercentage, ...restExt } = contractUpdateData.extension;
        if (extensionAmount !== undefined) {
          changesToLog.push({
            field: 'extensionAmount',
            oldValue: (originalContract.extension && originalContract.extension.extensionAmount) ?? null,
            newValue: extensionAmount,
          });
        }
        if (commissionPercentage !== undefined) {
          changesToLog.push({
            field: 'commissionPercentage',
            oldValue: (originalContract.extension && originalContract.extension.commissionPercentage) ?? null,
            newValue: commissionPercentage,
          });
        }
        // El change global
        const originalExtensionStr = JSON.stringify(
          originalContract.extension || {},
        );
        const newExtensionStr = JSON.stringify(contractUpdateData.extension);
        if (originalExtensionStr !== newExtensionStr) {
          changesToLog.push({
            field: 'extension',
            oldValue: originalContract.extension,
            newValue: contractUpdateData.extension,
          });
        }
      }

      // Variable para guardar el ID del historyEntry creado
      let createdHistoryEntryId: mongoose.Types.ObjectId | null = null;

      if (changesToLog.length > 0) {
        // Obtener información del usuario para createdBy
        const userInfo = await this.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
        
        const createdByValue = userInfo 
          ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
          : 'Usuario desconocido';
        

        
        // Preparar eventMetadata si es una extensión con información de pago
        // IMPORTANTE: Solo crear EXTENSION_UPDATED si el reasonForChange es "EXTENSION DE RENTA"
        let eventMetadata = undefined;
        let eventTypeId = undefined;
        // Normalizar el reasonForChange para comparación (trim y uppercase)
        const isExtensionReason = reasonForChange && 
          typeof reasonForChange === 'string' && 
          reasonForChange.trim().toUpperCase() === 'EXTENSION DE RENTA';
        
        if (contractUpdateData.extension?.extensionAmount && contractUpdateData.extension?.paymentMethod && isExtensionReason) {

          
          // Obtener el eventType del contractData (viene del payload)
          eventTypeId = (contractData as any).eventType || '68c72448518e24b76294edf4';
          
          // Obtener el vehículo del newCart si existe
          const vehicleId = (contractData as any).newCart?.vehicles?.[0]?.vehicle?._id || 
                           (contractData as any).newCart?.vehicles?.[0]?.vehicle;
          
          // Obtener el concierge del contractData
          const concierge = (contractData as any).concierge;
          
          eventMetadata = {
            amount: contractUpdateData.extension.extensionAmount,
            paymentMethod: contractUpdateData.extension.paymentMethod,
            paymentMedium: (contractData as any).extension?.paymentMedium || 'CUENTA',
            depositNote: (contractData as any).extension?.depositNote,
            vehicle: vehicleId,
            beneficiary: concierge,
            date: contractUpdateData.extension.newEndDateTime || new Date()
          };
        } else if (contractUpdateData.extension?.extensionAmount && !isExtensionReason) {
                  }

        // Solo crear el histórico EXTENSION_UPDATED si es realmente una extensión
        if (isExtensionReason && eventMetadata) {
          const savedHistory = await new this.contractHistoryModel({
            contract: id,
            performedBy: userId,
            action: ContractAction.EXTENSION_UPDATED,
            changes: changesToLog,
            details: `Se actualizaron campos del contrato.`,
            createdBy: createdByValue,
            eventMetadata: eventMetadata,
            eventType: eventTypeId ? new mongoose.Types.ObjectId(eventTypeId) : undefined,
          }).save({ session });
          
          createdHistoryEntryId = savedHistory._id;

          // NUEVA FUNCIONALIDAD: Si el status es APROBADO, actualizar totalPaid del booking
          if (contractUpdateData.status) {
            // Obtener el status para verificar si es APROBADO
            const CatStatus = this.connection.collection('cat_status');
            const statusDoc = await CatStatus.findOne({ _id: new mongoose.Types.ObjectId(contractUpdateData.status) });
            
            if (statusDoc && statusDoc.name === 'APROBADO') {
              console.log('[ContractRepository][update] Status es APROBADO - Actualizando totalPaid del booking');
              
              // Obtener el booking para actualizar totalPaid
              const booking = await this.bookingModel
                .findById(originalContract.booking)
                .session(session);
              
              if (booking && contractUpdateData.extension?.extensionAmount) {
                const currentTotalPaid = booking.totalPaid || booking.total || 0;
                const newTotalPaid = currentTotalPaid + contractUpdateData.extension.extensionAmount;
                
                booking.totalPaid = newTotalPaid;
                await booking.save({ session });
                
                console.log('[ContractRepository][update] totalPaid actualizado:', {
                  anterior: currentTotalPaid,
                  extension: contractUpdateData.extension.extensionAmount,
                  nuevo: newTotalPaid
                });
              }
            }
          }
        } else if (contractUpdateData.extension?.extensionAmount && !isExtensionReason) {
          // Si hay datos de extensión pero NO es una extensión real (ej: CRASH, CAMBIO DE VEHICULO, etc.)
          // Crear un histórico con el eventType correspondiente
          const eventTypeIdFromPayload = (contractData as any).eventType;
          
          // Obtener el vehículo del newCart si existe
          const vehicleId = (contractData as any).newCart?.vehicles?.[0]?.vehicle?._id || 
                           (contractData as any).newCart?.vehicles?.[0]?.vehicle;
          
          // Obtener el concierge del contractData
          const concierge = (contractData as any).concierge;
          
          // Crear eventMetadata para el evento (no extensión)
          const nonExtensionMetadata = {
            amount: contractUpdateData.extension.extensionAmount,
            paymentMethod: contractUpdateData.extension.paymentMethod,
            paymentMedium: (contractData as any).extension?.paymentMedium || 'CUENTA',
            depositNote: (contractData as any).extension?.depositNote,
            vehicle: vehicleId,
            beneficiary: concierge,
            date: contractUpdateData.extension.newEndDateTime || new Date()
          };
          
          const savedHistory = await new this.contractHistoryModel({
            contract: id,
            performedBy: userId,
            action: ContractAction.NOTE_ADDED, // Usar NOTE_ADDED para eventos personalizados
            changes: changesToLog,
            details: reasonForChange || 'Evento registrado',
            createdBy: createdByValue,
            eventMetadata: nonExtensionMetadata,
            eventType: eventTypeIdFromPayload ? new mongoose.Types.ObjectId(eventTypeIdFromPayload) : undefined,
          }).save({ session });
          
          createdHistoryEntryId = savedHistory._id;
        }
      }

      if (newCart) {
        // IMPORTANTE: Obtener el carrito anterior ANTES de aplicar los cambios
        const booking = await this.bookingModel
          .findById(originalContract.booking)
          .session(session);
        const oldCartData = JSON.parse(booking.cart);
        
        // Detectar si es un cambio de vehículo o una extensión
        const isVehicleChange = await this.isVehicleChangeEvent(contractData);
        const isExtension = this.isExtensionEvent(contractData);


        
        // Si es una extensión, NO crear BOOKING_MODIFIED porque ya se creó EXTENSION_UPDATED
        if (!isExtension) {
          // Solo aplicar cambios al booking si NO es una extensión
          await this.applyBookingChangesFromExtension(
            id,
            newCart,
            userId,
            reasonForChange,
            session,
            contractData // Nuevo: Se pasa el update completo como snapshot para el historial
          );
        } else {
          // Para extensiones, solo actualizar el carrito sin crear histórico adicional
          const lastVersion = await this.cartVersionModel
            .findOne({ booking: booking._id })
            .sort({ version: -1 })
            .session(session);
          const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

          const newCartVersion = new this.cartVersionModel({
            booking: booking._id,
            version: newVersionNumber,
            data: newCart,
          });
          await newCartVersion.save({ session });

          booking.activeCartVersion = newCartVersion._id;
          booking.cart = JSON.stringify(newCart);
          await booking.save({ session });
        }

        // Actualizar las reservas de vehículos con el carrito anterior y el nuevo
        await this.updateVehicleReservations(oldCartData, newCart, session, id, isVehicleChange, isExtension);
      }

      // Detectar TODOS los cambios (contract + booking/cart)
      const allChanges = [];
      
      // 1. Cambios en campos del contrato
      if (Object.keys(contractUpdateData).length > 0) {
        const contractChanges = this.detectChanges(
          {
            status: originalContract.status,
            reservingUser: originalContract.reservingUser,
            extension: originalContract.extension,
            concierge: originalContract.concierge,
            source: originalContract.source,
          },
          contractUpdateData
        );
        allChanges.push(...contractChanges);
      }

      // 2. Cambios en el carrito (si hay newCart)
      if (newCart && bookingBeforeUpdate) {
        const cartChanges = this.detectCartChanges(
          bookingBeforeUpdate.cart,
          newCart
        );
        allChanges.push(...cartChanges);
      }

      // 3. Crear el snapshot SOLO si hay cambios Y si se creó un historyEntry
      console.log('[ContractRepository][update] === VERIFICACIÓN DE SNAPSHOT ===');
      console.log('[ContractRepository][update] allChanges.length:', allChanges.length);
      console.log('[ContractRepository][update] createdHistoryEntryId:', createdHistoryEntryId);
      console.log('[ContractRepository][update] reasonForChange:', reasonForChange);
      
      if (allChanges.length > 0 && createdHistoryEntryId) {
        console.log('[ContractRepository][update] ✅ Condiciones cumplidas - Creando snapshot');
        console.log('[ContractRepository][update] Cambios detectados para snapshot:', JSON.stringify(allChanges, null, 2));
        
        const snapshot = {
          timestamp: new Date(),
          modifiedBy: new mongoose.Types.ObjectId(userId),
          changes: allChanges, // Solo los cambios, no el objeto completo
          reason: reasonForChange || 'Modificación del contrato',
          historyEntry: createdHistoryEntryId, // Vincular con el historyEntry
        };

        // Agregar el snapshot al array de snapshots del contrato
        await this.contractModel.updateOne(
          { _id: id },
          { $push: { snapshots: snapshot } },
          { session }
        );
        
        console.log('[ContractRepository][update] ✅ Snapshot creado exitosamente y vinculado con historyEntry:', createdHistoryEntryId);
      } else {
        console.log('[ContractRepository][update] ❌ NO se creó snapshot');
        if (allChanges.length === 0) {
          console.log('[ContractRepository][update] Razón: No hay cambios detectados');
        }
        if (!createdHistoryEntryId) {
          console.log('[ContractRepository][update] Razón: No se creó historyEntry');
        }
      }

      // Se actualiza el contrato principal como parte de la transacción.
      updatedContract = await this.contractModel.findByIdAndUpdate(
        id,
        contractUpdateData,
        { new: true, session: session },
      );

      if (!updatedContract) {
        throw new InternalServerErrorException(
          'No se pudo actualizar el contrato durante la transacción.',
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error(
        `Error en la transacción de actualización del contrato ${id}, cambios revertidos:`,
        error,
      );
      throw error;
    } finally {
      session.endSession();
    }

    // El populate y hydrate se hacen fuera y después de que la transacción fue exitosa.
    await updatedContract.populate([
      { path: 'booking' },
      { path: 'reservingUser' },
      { path: 'createdByUser' },
      { path: 'status' },
      { path: 'extension.paymentMethod' },
      { path: 'extension.extensionStatus' },
    ]);

    return ContractModel.hydrate(updatedContract.toObject());
  }

  private async updateVehicleReservations(
    oldCart: CartWithVehicles,
    newCart: CartWithVehicles,
    session: mongoose.ClientSession,
    contractId?: string,
    isVehicleChange?: boolean,
    isExtension?: boolean,
  ): Promise<void> {
    // Crear mapas de vehículos para comparar
    const oldVehiclesMap = new Map(
      (oldCart.vehicles || []).map((v: CartVehicleItem) => {
        const id =
          typeof v.vehicle === 'string' ? v.vehicle : v.vehicle._id.toString();
        return [id, v];
      }),
    );

    const newVehiclesMap = new Map(
      (newCart.vehicles || []).map((v: CartVehicleItem) => {
        const id =
          typeof v.vehicle === 'string' ? v.vehicle : v.vehicle._id.toString();
        return [id, v];
      }),
    );

    // Obtener el bookingId del contrato para una identificación más precisa
    let bookingId: string | undefined;
    if (contractId) {
      const contract = await this.contractModel.findById(contractId).session(session);
      bookingId = contract?.booking?.toString();
    }

    // Si es un cambio de vehículo, necesitamos manejar la lógica especial
    if (isVehicleChange) {

      
      // Encontrar el vehículo que fue removido (el actual que se está cambiando)
      for (const [vehicleId, oldVehicleItem] of oldVehiclesMap) {
        if (!newVehiclesMap.has(vehicleId)) {
          // Este es el vehículo que se está liberando

          await this.releaseVehicleReservation(
            vehicleId,
            new Date(oldVehicleItem.dates.start),
            new Date(oldVehicleItem.dates.end),
            session,
            bookingId,
          );
        }
      }

      // Los vehículos en newCart ya deberían tener sus reservas creadas
      // por el proceso normal de actualización del carrito

      return;
    }

    // 1. Liberar reservas de vehículos que ya no están en el nuevo carrito
    for (const [vehicleId, oldVehicleItem] of oldVehiclesMap) {
      if (!newVehiclesMap.has(vehicleId)) {
        // Este vehículo ya no está en uso, liberar su reserva
        await this.releaseVehicleReservation(
          vehicleId,
          new Date(oldVehicleItem.dates.start),
          new Date(oldVehicleItem.dates.end),
          session,
          bookingId,
        );
      }
    }

    // 2. Actualizar fechas de vehículos que siguen en uso pero con fechas diferentes
    for (const newVehicleItem of newCart.vehicles || []) {
      const vehicleId =
        typeof newVehicleItem.vehicle === 'string'
          ? newVehicleItem.vehicle
          : newVehicleItem.vehicle._id.toString();
      const oldVehicleItem = oldVehiclesMap.get(vehicleId);

      if (
        oldVehicleItem &&
        newVehicleItem.dates.end.toString() !==
          oldVehicleItem.dates.end.toString()
      ) {
        const originalEndDate = new Date(oldVehicleItem.dates.end);
        const newEndDate = new Date(newVehicleItem.dates.end);

        const vehicle = await this.vehicleModel
          .findById(vehicleId)
          .session(session);
        if (!vehicle || !vehicle.reservations) continue;

        const reservationsTyped = vehicle.reservations as ReservationWithId[];

        const reservationIndex = reservationsTyped.findIndex((reservation) => {
          const reservationEndTime = new Date(reservation.end).getTime();
          const originalEndTime = originalEndDate.getTime();
          return Math.abs(reservationEndTime - originalEndTime) <= 60000;
        });

        if (reservationIndex === -1) {
          console.warn(
            `No se encontró reserva coincidente para el vehículo ${vehicleId} con fecha ${originalEndDate}`,
          );
          continue;
        }

        const reservationToUpdateId = reservationsTyped[reservationIndex]._id;

        await this.vehicleModel.updateOne(
          { _id: vehicleId, 'reservations._id': reservationToUpdateId },
          { $set: { 'reservations.$.end': newEndDate } },
          { session },
        );
      }
    }
  }

  /**
   * Detecta todos los cambios entre dos objetos de manera profunda
   * Retorna solo los campos que cambiaron con sus valores anteriores y nuevos
   */
  private detectChanges(oldObj: any, newObj: any, path: string = ''): any[] {
    const changes = [];

    // Función helper para comparar valores
    const areEqual = (val1: any, val2: any): boolean => {
      if (val1 === val2) return true;
      if (val1 == null || val2 == null) return false;
      if (typeof val1 !== typeof val2) return false;
      
      // Para ObjectIds de Mongoose
      if (val1.toString && val2.toString && 
          val1.constructor.name === 'ObjectId' && val2.constructor.name === 'ObjectId') {
        return val1.toString() === val2.toString();
      }
      
      // Para fechas
      if (val1 instanceof Date && val2 instanceof Date) {
        return val1.getTime() === val2.getTime();
      }
      
      // Para objetos y arrays, comparar como JSON
      if (typeof val1 === 'object' && typeof val2 === 'object') {
        return JSON.stringify(val1) === JSON.stringify(val2);
      }
      
      return false;
    };

    // Si newObj tiene campos que oldObj no tiene o son diferentes
    for (const key in newObj) {
      if (newObj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        const oldValue = oldObj ? oldObj[key] : undefined;
        const newValue = newObj[key];

        if (!areEqual(oldValue, newValue)) {
          changes.push({
            field: currentPath,
            oldValue: oldValue,
            newValue: newValue,
          });
        }
      }
    }

    return changes;
  }

  /**
   * Detecta cambios en el carrito del booking
   */
  private detectCartChanges(oldCart: any, newCart: any): any[] {
    const changes = [];

    try {
      const oldCartObj = typeof oldCart === 'string' ? JSON.parse(oldCart) : oldCart;
      const newCartObj = typeof newCart === 'string' ? JSON.parse(newCart) : newCart;

      // Comparar vehículos
      const oldVehicles = oldCartObj?.vehicles || [];
      const newVehicles = newCartObj?.vehicles || [];
      
      if (JSON.stringify(oldVehicles) !== JSON.stringify(newVehicles)) {
        changes.push({
          field: 'booking.cart.vehicles',
          oldValue: oldVehicles,
          newValue: newVehicles,
        });
      }

      // Comparar tours
      const oldTours = oldCartObj?.tours || [];
      const newTours = newCartObj?.tours || [];
      
      if (JSON.stringify(oldTours) !== JSON.stringify(newTours)) {
        changes.push({
          field: 'booking.cart.tours',
          oldValue: oldTours,
          newValue: newTours,
        });
      }

      // Comparar tickets
      const oldTickets = oldCartObj?.tickets || [];
      const newTickets = newCartObj?.tickets || [];
      
      if (JSON.stringify(oldTickets) !== JSON.stringify(newTickets)) {
        changes.push({
          field: 'booking.cart.tickets',
          oldValue: oldTickets,
          newValue: newTickets,
        });
      }

      // Comparar transfers
      const oldTransfer = oldCartObj?.transfer || [];
      const newTransfer = newCartObj?.transfer || [];
      
      if (JSON.stringify(oldTransfer) !== JSON.stringify(newTransfer)) {
        changes.push({
          field: 'booking.cart.transfer',
          oldValue: oldTransfer,
          newValue: newTransfer,
        });
      }

      // Comparar totales y otros campos del carrito
      if (oldCartObj?.total !== newCartObj?.total) {
        changes.push({
          field: 'booking.cart.total',
          oldValue: oldCartObj?.total,
          newValue: newCartObj?.total,
        });
      }

      if (oldCartObj?.subtotal !== newCartObj?.subtotal) {
        changes.push({
          field: 'booking.cart.subtotal',
          oldValue: oldCartObj?.subtotal,
          newValue: newCartObj?.subtotal,
        });
      }

    } catch (error) {
      console.error('[detectCartChanges] Error al detectar cambios en el carrito:', error);
    }

    return changes;
  }

  /**
   * Detecta si el evento es un cambio de vehículo
   */
  private async isVehicleChangeEvent(contractData: UpdateContractDTO): Promise<boolean> {
    try {
      // Verificar si hay eventType en el contractData
      const eventTypeId = (contractData as any).eventType;
      
      if (!eventTypeId) {
        return false;
      }

      // Buscar el evento en el catálogo
      const catEvent = await this.catContractEventModel
        .findById(eventTypeId)
        .lean();

      if (!catEvent) {
        return false;
      }

      // Verificar si el nombre del evento es "CAMBIO DE VEHICULO"
      const eventName = (catEvent as any).name;
      return eventName === 'CAMBIO DE VEHICULO';
    } catch (error) {

      return false;
    }
  }

  /**
   * Detecta si el movimiento es una extensión
   */
  private isExtensionEvent(contractData: UpdateContractDTO): boolean {
    // Una extensión se detecta por la presencia de extension con newEndDateTime
    return !!(contractData.extension && contractData.extension.newEndDateTime);
  }

  /**
   * Libera una reserva específica de un vehículo
   */
  private async releaseVehicleReservation(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    session: mongoose.ClientSession,
    bookingId?: string,
  ): Promise<void> {
    try {
      const vehicle = await this.vehicleModel
        .findById(vehicleId)
        .session(session);
      
      if (!vehicle || !vehicle.reservations) {

        return;
      }

      const reservationsTyped = vehicle.reservations as ReservationWithId[];
      
      // Encontrar la reserva que coincide con el booking
      const reservationIndex = reservationsTyped.findIndex((reservation) => {
        // Si tenemos bookingId, usarlo como identificador principal
        if (bookingId && (reservation as any).bookingId) {
          return (reservation as any).bookingId === bookingId;
        }

        // Fallback: usar fechas con tolerancia mejorada
        const reservationStart = new Date(reservation.start).getTime();
        const reservationEnd = new Date(reservation.end).getTime();
        const bookingStart = startDate.getTime();
        const bookingEnd = endDate.getTime();

        // Permitir tolerancia de 5 minutos para diferencias de fecha (más seguro)
        const startDiff = Math.abs(reservationStart - bookingStart);
        const endDiff = Math.abs(reservationEnd - bookingEnd);

        return startDiff <= 300000 && endDiff <= 300000; // 5 minutes tolerance
      });

      if (reservationIndex === -1) {
        console.warn(
          `No se encontró reserva coincidente para el vehículo ${vehicleId}${bookingId ? ` (booking: ${bookingId})` : ` con fechas ${startDate} - ${endDate}`}`,
        );
        return;
      }

      // Remover la reserva del array
      const reservationToRemoveId = reservationsTyped[reservationIndex]._id;
      
      await this.vehicleModel.updateOne(
        { _id: vehicleId },
        { $pull: { reservations: { _id: reservationToRemoveId } } },
        { session },
      );

      console.log(`Reserva liberada para vehículo ${vehicleId}${bookingId ? ` (booking: ${bookingId})` : ` en fechas ${startDate} - ${endDate}`}`);
    } catch (error) {

      throw error;
    }
  }

  async createHistoryEvent(
    contractId: string,
    userId: string,
    eventType: string,
    details: string,
    metadata?: Record<string, any>,
  ): Promise<ContractHistory> {

    
    // Obtener información del usuario para createdBy
    const userInfo = await this.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    console.log('[ContractRepository][createHistoryEvent] userInfo encontrado:', JSON.stringify(userInfo, null, 2));
    
    const createdByValue = userInfo 
      ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
      : 'Usuario desconocido';
    

    
    // Permitir que eventType sea un ObjectId string del catálogo
    const eventTypeId = mongoose.Types.ObjectId.isValid(eventType)
      ? new mongoose.Types.ObjectId(eventType)
      : undefined;
    let detailToUse = details;
    if (eventTypeId) {
      const catEvent = await this.catContractEventModel
        .findById(eventTypeId)
        .lean();
      if (catEvent && (catEvent as any).name) {
        detailToUse = (catEvent as any).name;
      }
    }

    const historyEntry = new this.contractHistoryModel({
      contract: contractId,
      performedBy: userId,
      action: ContractAction.NOTE_ADDED,
      eventType: eventTypeId,
      details: detailToUse,
      eventMetadata: metadata,
      changes: [],
      createdBy: createdByValue,
    });

    const savedHistory = await historyEntry.save();

    // Persistir en booking.metadata los campos relevantes de metadata (si vienen)
    try {
      if (metadata && (typeof metadata === 'object')) {
        const setObj: any = {};
        if ((metadata as any).paymentMedium !== undefined) {
          setObj['metadata.paymentMedium'] = (metadata as any).paymentMedium;
        }
        if ((metadata as any).depositNote !== undefined) {
          setObj['metadata.depositNote'] = (metadata as any).depositNote;
        }
        if (Object.keys(setObj).length > 0) {
          const contractDoc = await this.contractModel.findById(contractId).lean();
          if (contractDoc?.booking) {
            await this.bookingModel.updateOne({ _id: contractDoc.booking }, { $set: setObj });
          }
        }
      }
    } catch (err) {

    }

    return savedHistory;
  }

  async softDeleteHistoryEntry(
    historyId: string,
    userId: string,
    reason?: string
  ): Promise<ContractHistory> {

    
    const historyEntry = await this.contractHistoryModel.findById(historyId)
      .populate('eventType');
    
    if (!historyEntry) {
      throw new NotFoundException(`Movimiento con ID "${historyId}" no encontrado.`);
    }

    if (historyEntry.isDeleted) {
      throw new BaseErrorException('El movimiento ya está eliminado', HttpStatus.BAD_REQUEST);
    }

    // Verificar que no sea un movimiento crítico (como CONTRACT_CREATED)
    if (historyEntry.action === ContractAction.CONTRACT_CREATED) {
      throw new BaseErrorException(
        'No se puede eliminar el movimiento de creación del contrato',
        HttpStatus.FORBIDDEN
      );
    }

    // NUEVA FUNCIONALIDAD: Detectar y eliminar automáticamente extensiones hu��rfanas
    const isCambioVehiculo = historyEntry.eventType && 
      (historyEntry.eventType as any).name === 'CAMBIO DE VEHICULO';

    const isExtensionRenta = historyEntry.action === ContractAction.EXTENSION_UPDATED ||
      (historyEntry.eventType && (historyEntry.eventType as any).name === 'EXTENSION DE RENTA');

    // Array para almacenar las extensiones eliminadas automáticamente
    const extensionesEliminadas: any[] = [];

    if (isCambioVehiculo) {
      console.log('[softDeleteHistoryEntry] Detectado CAMBIO DE VEHICULO - Buscando extensiones posteriores para eliminar...');
      
      // Buscar extensiones posteriores a este cambio de vehículo
      const historyEntryDoc: any = historyEntry.toObject ? historyEntry.toObject() : historyEntry;
      const extensionesPosteriores = await this.contractHistoryModel.find({
        contract: historyEntry.contract,
        createdAt: { $gt: historyEntryDoc.createdAt },
        isDeleted: false,
        $or: [
          { action: ContractAction.EXTENSION_UPDATED },
          { 'eventType': await this.catContractEventModel.findOne({ name: 'EXTENSION DE RENTA' }).then(e => e?._id) }
        ]
      }).sort({ createdAt: 1 });

      if (extensionesPosteriores.length > 0) {
        console.log(`[softDeleteHistoryEntry] Se encontraron ${extensionesPosteriores.length} extensiones posteriores - Eliminando automáticamente...`);
        
        // Eliminar cada extensión posterior automáticamente
        for (const extension of extensionesPosteriores) {
          try {
            const extensionDoc: any = extension.toObject ? extension.toObject() : extension;
            const fecha = new Date(extensionDoc.createdAt).toLocaleString('es-MX');
            const monto = extensionDoc.eventMetadata?.amount || 0;
            
            // Marcar como eliminada
            extension.isDeleted = true;
            extension.deletedBy = new mongoose.Types.ObjectId(userId) as any;
            extension.deletedByInfo = `Sistema (eliminación automática por cambio de vehículo)`;
            extension.deletedAt = new Date();
            extension.deletionReason = `Eliminada automáticamente al eliminar el cambio de vehículo del ${new Date(historyEntryDoc.createdAt).toLocaleString('es-MX')}`;
            
            await extension.save();
            
            extensionesEliminadas.push({
              fecha,
              monto,
              id: extensionDoc._id
            });
            
            console.log(`[softDeleteHistoryEntry] Extensión eliminada: ${fecha} por ${monto}`);
            
            // Restaurar el carrito de esta extensión también
            try {
              await this.restoreCartFromSnapshot(extension, userId, 'EXTENSION DE RENTA');
            } catch (restoreError) {
              console.error(`[softDeleteHistoryEntry] Error al restaurar extensión ${extensionDoc._id}:`, restoreError);
            }
          } catch (error) {
            console.error('[softDeleteHistoryEntry] Error al eliminar extensión posterior:', error);
          }
        }
        
        console.log(`[softDeleteHistoryEntry] ✅ ${extensionesEliminadas.length} extensión(es) eliminada(s) automáticamente`);
      }
    }

    if (isExtensionRenta) {
      console.log('[softDeleteHistoryEntry] Detectada EXTENSION DE RENTA - Buscando cambios de vehículo posteriores para eliminar...');
      
      // Buscar cambios de vehículo posteriores a esta extensión
      const historyEntryDoc: any = historyEntry.toObject ? historyEntry.toObject() : historyEntry;
      const cambiosPosteriores = await this.contractHistoryModel.find({
        contract: historyEntry.contract,
        createdAt: { $gt: historyEntryDoc.createdAt },
        isDeleted: false,
        'eventType': await this.catContractEventModel.findOne({ name: 'CAMBIO DE VEHICULO' }).then(e => e?._id)
      }).sort({ createdAt: 1 });

      if (cambiosPosteriores.length > 0) {
        console.log(`[softDeleteHistoryEntry] Se encontraron ${cambiosPosteriores.length} cambios de vehículo posteriores - Eliminando automáticamente...`);
        
        // Eliminar cada cambio posterior automáticamente
        for (const cambio of cambiosPosteriores) {
          try {
            const cambioDoc: any = cambio.toObject ? cambio.toObject() : cambio;
            const fecha = new Date(cambioDoc.createdAt).toLocaleString('es-MX');
            
            // Marcar como eliminado
            cambio.isDeleted = true;
            cambio.deletedBy = new mongoose.Types.ObjectId(userId) as any;
            cambio.deletedByInfo = `Sistema (eliminación automática por extensión)`;
            cambio.deletedAt = new Date();
            cambio.deletionReason = `Eliminado automáticamente al eliminar la extensión del ${new Date(historyEntryDoc.createdAt).toLocaleString('es-MX')}`;
            
            await cambio.save();
            
            console.log(`[softDeleteHistoryEntry] Cambio de vehículo eliminado: ${fecha}`);
            
            // Restaurar el carrito de este cambio también
            try {
              await this.restoreCartFromSnapshot(cambio, userId, 'CAMBIO DE VEHICULO');
            } catch (restoreError) {
              console.error(`[softDeleteHistoryEntry] Error al restaurar cambio ${cambioDoc._id}:`, restoreError);
            }
          } catch (error) {
            console.error('[softDeleteHistoryEntry] Error al eliminar cambio posterior:', error);
          }
        }
        
        console.log(`[softDeleteHistoryEntry] ✅ ${cambiosPosteriores.length} cambio(s) de vehículo eliminado(s) automáticamente`);
      }
    }

    // Obtener información del usuario que elimina para deletedByInfo
    const userInfo = await this.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    console.log('[ContractRepository][softDeleteHistoryEntry] userInfo encontrado:', JSON.stringify(userInfo, null, 2));
    
    const deletedByInfoValue = userInfo 
      ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
      : 'Usuario desconocido';
    

    // RESTAURACIÓN: Restaurar fecha y vehículo si es una EXTENSION DE RENTA o CAMBIO DE VEHICULO
    // (Ya validamos arriba que no hay dependencias posteriores)
    if (isExtensionRenta || isCambioVehiculo) {
      const eventTypeName = isExtensionRenta ? 'EXTENSION DE RENTA' : 'CAMBIO DE VEHICULO';
      console.log(`[softDeleteHistoryEntry] Detectada ${eventTypeName} - Restaurando estado anterior`);
      
      try {
        await this.restoreCartFromSnapshot(historyEntry, userId, eventTypeName);
      } catch (error) {
        console.error(`[softDeleteHistoryEntry] Error al restaurar datos de ${eventTypeName}:`, error);
        // Continuar con la eliminación aunque falle la restauración
      }
    }

    historyEntry.isDeleted = true;
    historyEntry.deletedBy = new mongoose.Types.ObjectId(userId) as any;
    historyEntry.deletedByInfo = deletedByInfoValue;
    historyEntry.deletedAt = new Date();
    
    // Agregar información sobre extensiones eliminadas automáticamente al reason
    let finalReason = reason || '';
    if (extensionesEliminadas.length > 0) {
      const detallesExtensiones = extensionesEliminadas.map((ext, index) => 
        `${index + 1}. Extensión del ${ext.fecha} por ${ext.monto}`
      ).join('\n');
      
      finalReason += `\n\n⚠️ Se eliminaron automáticamente ${extensionesEliminadas.length} extensión(es) posterior(es):\n${detallesExtensiones}`;
    }
    
    historyEntry.deletionReason = finalReason;

    const savedHistory = await historyEntry.save();

    // Si el historyEntry tiene un movimiento relacionado, eliminarlo también
    if (historyEntry.relatedMovement) {
      try {
        const Movement = this.connection.model('Movement');
        const movement = await Movement.findById(historyEntry.relatedMovement);
        
        if (movement && !movement.isDeleted) {
          console.log(`[ContractRepository] Eliminando movimiento relacionado: ${historyEntry.relatedMovement}`);
          
          movement.isDeleted = true;
          movement.deletedBy = userId;
          movement.deletedAt = new Date();
          movement.deletionReason = reason || 'Eliminado automáticamente al eliminar la entrada del histórico del contrato';
          
          await movement.save();
          console.log(`[ContractRepository] Movimiento eliminado exitosamente`);
        }
      } catch (error) {
        console.error('[ContractRepository] Error al eliminar movimiento relacionado:', error);
        // No lanzar error para no interrumpir la eliminación del historyEntry
      }
    }

    // Si es un evento de DELIVERY, actualizar el booking para quitar el delivery
    const isDeliveryEvent = historyEntry.eventType && 
      (historyEntry.eventType as any).name === 'DELIVERY';
    
    if (isDeliveryEvent) {
      try {
        console.log('[ContractRepository] Detectado evento DELIVERY - Actualizando booking...');
        
        // Obtener el contrato para acceder al booking
        const contract = await this.contractModel.findById(historyEntry.contract);
        
        if (contract && contract.booking) {
          const booking = await this.bookingModel.findById(contract.booking);
          
          if (booking) {
            console.log(`[ContractRepository] Booking encontrado: ${booking._id}`);
            
            // Obtener el costo del delivery antes de eliminarlo
            const deliveryCost = booking.deliveryCost || 0;
            
            // 1. Actualizar campos del booking
            booking.requiresDelivery = false;
            booking.deliveryType = undefined;
            booking.oneWayType = undefined;
            booking.deliveryAddress = undefined;
            booking.deliveryCost = 0;
            
            // 2. Descontar el delivery del totalPaid si corresponde
            if (booking.totalPaid && deliveryCost > 0) {
              const newTotalPaid = Math.max(0, booking.totalPaid - deliveryCost);
              booking.totalPaid = newTotalPaid;
              console.log(`[ContractRepository] totalPaid actualizado: ${booking.totalPaid} - ${deliveryCost} = ${newTotalPaid}`);
            }
            
            // 3. Actualizar el cart para quitar el delivery
            if (booking.cart) {
              try {
                const cartData = JSON.parse(booking.cart);
                
                // Quitar delivery a nivel de cart (formato antiguo)
                if (cartData.delivery !== undefined) {
                  cartData.delivery = false;
                  cartData.deliveryAddress = null;
                }
                
                // Quitar delivery de los vehículos (formato nuevo)
                if (cartData.vehicles && Array.isArray(cartData.vehicles)) {
                  cartData.vehicles = cartData.vehicles.map((v: any) => {
                    if (v.delivery) {
                      // Eliminar el objeto delivery del vehículo
                      const { delivery, ...vehicleWithoutDelivery } = v;
                      return vehicleWithoutDelivery;
                    }
                    return v;
                  });
                }
                
                booking.cart = JSON.stringify(cartData);
                console.log('[ContractRepository] Cart actualizado para quitar delivery');
              } catch (cartError) {
                console.error('[ContractRepository] Error al actualizar cart:', cartError);
              }
            }
            
            await booking.save();
            console.log('[ContractRepository] Booking actualizado exitosamente');
          }
        }
      } catch (error) {
        console.error('[ContractRepository] Error al actualizar booking:', error);
        // No lanzar error para no interrumpir la eliminación del historyEntry
      }
    }

    // Eliminar el snapshot asociado a este historyEntry
    try {
      const contractId = historyEntry.contract;
      await this.contractModel.updateOne(
        { _id: contractId },
        { $pull: { snapshots: { historyEntry: new mongoose.Types.ObjectId(historyId) } } }
      );
      console.log(`[softDeleteHistoryEntry] Snapshot asociado al historyEntry ${historyId} eliminado exitosamente`);
    } catch (error) {
      console.error(`[softDeleteHistoryEntry] Error al eliminar snapshot asociado:`, error);
      // No lanzar error para no interrumpir la eliminación del historyEntry
    }

    return savedHistory;
  }

  /**
   * Restaura el carrito desde el snapshot cuando se elimina una extensión o cambio de vehículo
   */
  private async restoreCartFromSnapshot(
    historyEntry: ContractHistory,
    userId: string,
    eventTypeName: string
  ): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Obtener el contrato
      const contract = await this.contractModel
        .findById(historyEntry.contract)
        .session(session);
      
      if (!contract) {
        throw new NotFoundException('Contrato no encontrado');
      }

      // 2. Obtener el booking asociado
      const booking = await this.bookingModel
        .findById(contract.booking)
        .session(session);
      
      if (!booking) {
        throw new NotFoundException('Booking no encontrado');
      }

      // 3. Buscar el carrito anterior a la extensión
      let oldCart: any = null;
      const historyEntryDoc = historyEntry as any; // Cast para acceder a createdAt y _id

      console.log(`[restoreCartFromSnapshot] Buscando carrito anterior para ${eventTypeName}...`);
      console.log(`[restoreCartFromSnapshot] HistoryEntry ID: ${historyEntryDoc._id}`);
      console.log(`[restoreCartFromSnapshot] HistoryEntry createdAt:`, historyEntryDoc.createdAt);

      // ESTRATEGIA 1: Buscar en el SNAPSHOT del contrato (más confiable)
      // El snapshot guarda el oldValue del carrito antes del cambio
      console.log(`[restoreCartFromSnapshot] ESTRATEGIA 1: Buscando en snapshots del contrato...`);
      
      const contractDoc = await this.contractModel
        .findById(contract._id)
        .session(session);
      
      if (contractDoc && (contractDoc as any).snapshots) {
        const snapshots = (contractDoc as any).snapshots;
        
        // Buscar el snapshot vinculado a este historyEntry
        const extensionSnapshot = snapshots.find((s: any) => 
          s.historyEntry && s.historyEntry.toString() === historyEntryDoc._id.toString()
        );
        
        if (extensionSnapshot) {
          console.log('[restoreExtensionData] Snapshot de extensión encontrado');
          
          // Buscar el cambio en booking.cart.vehicles que tiene el oldValue
          for (const change of extensionSnapshot.changes || []) {
            if (change.field === 'booking.cart.vehicles' && change.oldValue) {
              // Reconstruir el carrito con los vehículos anteriores
              const currentCartObj = JSON.parse(booking.cart);
              oldCart = {
                ...currentCartObj,
                vehicles: change.oldValue
              };
              console.log('[restoreExtensionData] Carrito reconstruido desde snapshot de extensión');
              console.log('[restoreExtensionData] Cart dates:', oldCart?.vehicles?.[0]?.dates);
              break;
            }
          }
        }
      }

      // ESTRATEGIA 2: Buscar en CartVersion la versión ANTERIOR a cuando se creó la extensión
      console.log('[restoreExtensionData] Buscando en CartVersion...');
      
      // Obtener todas las versiones del carrito ordenadas por fecha de creación
      const allCartVersions = await this.cartVersionModel
        .find({ booking: booking._id })
        .sort({ createdAt: 1 }) // Ordenar por fecha de creación ascendente
        .session(session)
        .lean();

      console.log('[restoreExtensionData] Total cart versions found:', allCartVersions.length);

      if (allCartVersions.length > 0) {
        // Buscar la versión del carrito que fue creada ANTES del historyEntry de extensión
        let cartVersionBeforeExtension = null;
        
        for (let i = allCartVersions.length - 1; i >= 0; i--) {
          const cartVersion = allCartVersions[i];
          const cartCreatedAt = (cartVersion as any).createdAt;
          
          console.log(`[restoreExtensionData] Checking cart version ${(cartVersion as any).version}, createdAt:`, cartCreatedAt);
          
          // Buscar la versión creada ANTES de la extensión
          if (cartCreatedAt < historyEntryDoc.createdAt) {
            cartVersionBeforeExtension = cartVersion;
            console.log('[restoreExtensionData] Found cart version BEFORE extension:', (cartVersion as any).version);
            break;
          }
        }

        if (cartVersionBeforeExtension) {
          oldCart = (cartVersionBeforeExtension as any).data;
          console.log('[restoreExtensionData] Using cart from version:', (cartVersionBeforeExtension as any).version);
          console.log('[restoreExtensionData] Cart dates:', oldCart?.vehicles?.[0]?.dates);
        }
      }

      // ESTRATEGIA 3: Buscar en el historial ANTERIOR a la extensión
      if (!oldCart) {
        console.log('[restoreExtensionData] Buscando en historial anterior...');
        
        const previousHistory = await this.contractHistoryModel
          .findOne({
            contract: historyEntry.contract,
            createdAt: { $lt: historyEntryDoc.createdAt },
            isDeleted: false,
            action: ContractAction.BOOKING_MODIFIED
          })
          .sort({ createdAt: -1 })
          .session(session);

        if (previousHistory && previousHistory.changes) {
          for (const change of previousHistory.changes) {
            if (change.field === 'activeCartVersion' && change.cartSnapshot) {
              oldCart = change.cartSnapshot;
              console.log('[restoreExtensionData] Carrito encontrado en historial anterior (BOOKING_MODIFIED)');
              console.log('[restoreExtensionData] Cart dates:', oldCart?.vehicles?.[0]?.dates);
              break;
            }
          }
        }
      }

      // ESTRATEGIA 4: Buscar en el snapshot del contrato
      if (!oldCart) {
        console.log('[restoreExtensionData] Buscando en snapshots del contrato...');
        
        const contractDoc = await this.contractModel
          .findById(contract._id)
          .session(session);
        
        if (contractDoc && (contractDoc as any).snapshots) {
          const snapshots = (contractDoc as any).snapshots;
          
          // Buscar el snapshot anterior al de la extensión
          const sortedSnapshots = snapshots
            .filter((s: any) => s.timestamp < historyEntryDoc.createdAt)
            .sort((a: any, b: any) => b.timestamp - a.timestamp);
          
          if (sortedSnapshots.length > 0) {
            const previousSnapshot = sortedSnapshots[0];
            
            // Buscar cambios en el carrito en ese snapshot
            for (const change of previousSnapshot.changes || []) {
              if (change.field === 'booking.cart.vehicles' && change.oldValue) {
                // Reconstruir el carrito con los vehículos anteriores
                const currentCartObj = JSON.parse(booking.cart);
                oldCart = {
                  ...currentCartObj,
                  vehicles: change.oldValue
                };
                console.log('[restoreExtensionData] Carrito reconstruido desde snapshot del contrato');
                console.log('[restoreExtensionData] Cart dates:', oldCart?.vehicles?.[0]?.dates);
                break;
              }
            }
          }
        }
      }

      // FALLBACK: Si no encontramos nada, no podemos restaurar
      if (!oldCart) {
        console.error('[restoreExtensionData] No se pudo encontrar el carrito anterior. No se puede restaurar.');
        throw new Error('No se pudo encontrar el carrito anterior para restaurar la extensión');
      }

      // Validar que el carrito encontrado realmente tiene fechas diferentes
      const currentCartObj = JSON.parse(booking.cart);
      const currentEndDate = currentCartObj?.vehicles?.[0]?.dates?.end;
      const oldEndDate = oldCart?.vehicles?.[0]?.dates?.end;

      console.log('[restoreExtensionData] Comparando fechas:');
      console.log('[restoreExtensionData] Fecha actual (extendida):', currentEndDate);
      console.log('[restoreExtensionData] Fecha a restaurar:', oldEndDate);

      if (currentEndDate === oldEndDate) {
        console.warn('[restoreExtensionData] ADVERTENCIA: Las fechas son iguales. El carrito encontrado puede no ser el correcto.');
        console.warn('[restoreExtensionData] Esto indica que no se guardó correctamente el estado anterior.');
      }

      // 7. Actualizar el booking con el carrito restaurado Y restar el monto de la extensión del totalPaid
      if (oldCart) {
        // Crear nueva versión del carrito
        const lastVersion = await this.cartVersionModel
          .findOne({ booking: booking._id })
          .sort({ version: -1 })
          .session(session);
        const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

        const newCartVersion = new this.cartVersionModel({
          booking: booking._id,
          version: newVersionNumber,
          data: oldCart,
        });
        await newCartVersion.save({ session });

        booking.activeCartVersion = newCartVersion._id;
        booking.cart = JSON.stringify(oldCart);

        // IMPORTANTE: Restar el monto de la extensión del totalPaid
        // Buscar el monto de la extensión en el eventMetadata del historyEntry
        const extensionAmount = (historyEntry as any).eventMetadata?.amount || 0;
        
        if (extensionAmount > 0 && booking.totalPaid) {
          const previousTotalPaid = booking.totalPaid;
          booking.totalPaid = Math.max(0, booking.totalPaid - extensionAmount);
          
          console.log('[restoreExtensionData] totalPaid actualizado:', {
            anterior: previousTotalPaid,
            extensionRestada: extensionAmount,
            nuevo: booking.totalPaid
          });
        } else if (extensionAmount > 0) {
          console.warn('[restoreExtensionData] No se pudo restar extensión: totalPaid no existe en el booking');
        }

        // Guardar el booking con el carrito restaurado
        const savedBooking = await booking.save({ session });
        
        console.log('[restoreExtensionData] Carrito restaurado con fecha anterior');
        console.log('[restoreExtensionData] Booking guardado - Verificando datos:');
        console.log('[restoreExtensionData] booking._id:', savedBooking._id);
        console.log('[restoreExtensionData] booking.cart (primeros 200 chars):', savedBooking.cart.substring(0, 200));
        console.log('[restoreExtensionData] booking.totalPaid:', savedBooking.totalPaid);
        
        // Verificar que el carrito se guardó correctamente leyéndolo de nuevo
        const verifyBooking = await this.bookingModel
          .findById(booking._id)
          .session(session)
          .lean();
        
        if (verifyBooking) {
          const verifyCart = JSON.parse(verifyBooking.cart);
          console.log('[restoreExtensionData] VERIFICACIÓN - Carrito leído de DB:', {
            endDate: verifyCart?.vehicles?.[0]?.dates?.end,
            totalPaid: verifyBooking.totalPaid
          });
        }
      }

      // 8. Actualizar las reservas de vehículos
      const currentCart = JSON.parse(booking.cart);
      if (oldCart && oldCart.vehicles) {
        await this.updateVehicleReservations(
          currentCart,
          oldCart,
          session,
          contract._id.toString(),
          false,
          false
        );
      }

      // 9. Crear un registro en el historial indicando la restauración
      const userInfo = await this.connection.db.collection('users').findOne({ 
        _id: new mongoose.Types.ObjectId(userId) 
      });
      
      const createdByValue = userInfo 
        ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
        : 'Usuario desconocido';

      const restorationHistory = new this.contractHistoryModel({
        contract: contract._id,
        performedBy: userId,
        action: ContractAction.NOTE_ADDED,
        details: `Restauración automática por eliminación de extensión de renta. Fecha y vehículo restaurados al estado anterior.`,
        createdBy: createdByValue,
        changes: [
          {
            field: 'restoration',
            oldValue: 'Estado con extensión',
            newValue: 'Estado anterior a la extensión',
            cartSnapshot: oldCart
          }
        ]
      });
      await restorationHistory.save({ session });

      await session.commitTransaction();
      console.log('[restoreExtensionData] Datos de extensión restaurados exitosamente');
    } catch (error) {
      await session.abortTransaction();
      console.error('[restoreExtensionData] Error al restaurar datos de extensión:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async restoreHistoryEntry(historyId: string): Promise<ContractHistory> {
    // Buscar incluyendo los eliminados
    const historyEntry = await this.contractHistoryModel
      .findById(historyId)
      .setOptions({ includeDeleted: true });
    
    if (!historyEntry) {
      throw new NotFoundException(`Movimiento con ID "${historyId}" no encontrado.`);
    }

    if (!historyEntry.isDeleted) {
      throw new BaseErrorException('El movimiento no está eliminado', HttpStatus.BAD_REQUEST);
    }

    historyEntry.isDeleted = false;
    historyEntry.deletedBy = undefined;
    historyEntry.deletedAt = undefined;
    historyEntry.deletionReason = undefined;

    return historyEntry.save();
  }

  async getDeletedHistoryEntries(contractId: string): Promise<ContractHistory[]> {
    return this.contractHistoryModel
      .find({ 
        contract: contractId,
        isDeleted: true 
      })
      .sort({ createdAt: 'asc' })
      .populate('performedBy', 'name lastName email')
      .populate('deletedBy', 'name lastName email')
      .populate('eventType')
      .exec();
  }

  /**
   * TEMPORAL: Obtiene un contrato por número de booking con timeline y movimientos enlazados
   */
  async getContractWithMovementsByBookingNumber(bookingNumber: number): Promise<any> {
    // 1. Buscar el booking por número
    const booking = await this.bookingModel.findOne({ bookingNumber }).lean();
    
    if (!booking) {
      throw new NotFoundException(`Booking con número ${bookingNumber} no encontrado`);
    }

    // 2. Buscar el contrato asociado al booking
    const contract = await this.contractModel
      .findOne({ booking: booking._id })
      .populate('booking')
      .populate('reservingUser')
      .populate('createdByUser')
      .populate('status')
      .populate('extension.paymentMethod')
      .populate('extension.extensionStatus')
      .lean();

    if (!contract) {
      throw new NotFoundException(`Contrato para booking ${bookingNumber} no encontrado`);
    }

    // 3. Obtener el timeline del contrato (incluyendo eliminados)
    const timeline = await this.contractHistoryModel
      .find({ contract: contract._id })
      .setOptions({ includeDeleted: true })
      .sort({ createdAt: 'asc' })
      .populate('performedBy', 'name lastName email')
      .populate('deletedBy', 'name lastName email')
      .populate('eventType')
      .lean();

    // 4. Obtener todos los IDs de histórico para buscar movimientos
    const historyIds = timeline.map(h => h._id);

    // 5. Buscar movimientos enlazados (incluyendo eliminados)
    const Movement = this.connection.collection('movement');
    const movements = await Movement.find({
      contractHistoryEntry: { $in: historyIds }
    }).toArray();

    // 6. Crear un mapa de movimientos por historyId
    const movementsByHistoryId = new Map();
    movements.forEach(movement => {
      if (movement.contractHistoryEntry) {
        movementsByHistoryId.set(
          movement.contractHistoryEntry.toString(),
          movement
        );
      }
    });

    // 7. Enriquecer el timeline con los movimientos relacionados
    const enrichedTimeline = timeline.map(historyEntry => {
      const movement = movementsByHistoryId.get(historyEntry._id.toString());
      
      return {
        ...historyEntry,
        relatedMovement: historyEntry.relatedMovement,
        movementData: movement || null,
        hasMovement: !!movement,
        movementLink: movement ? {
          _id: movement._id,
          amount: movement.amount,
          type: movement.type,
          direction: movement.direction,
          paymentMethod: movement.paymentMethod,
          isDeleted: movement.isDeleted || false,
          deletedAt: movement.deletedAt,
          deletedBy: movement.deletedBy,
          deletionReason: movement.deletionReason
        } : null
      };
    });

    // 8. Buscar también movimientos que no tengan histórico enlazado (huérfanos)
    const orphanMovements = await Movement.find({
      $or: [
        { contractHistoryEntry: { $exists: false } },
        { contractHistoryEntry: null }
      ]
    }).toArray();

    // 9. Retornar toda la información
    return {
      contract: {
        _id: contract._id,
        booking: contract.booking,
        reservingUser: contract.reservingUser,
        createdByUser: contract.createdByUser,
        status: contract.status,
        extension: contract.extension,
        createdAt: (contract as any).createdAt,
        updatedAt: (contract as any).updatedAt
      },
      timeline: enrichedTimeline,
      movements: {
        linked: movements.filter(m => m.contractHistoryEntry),
        orphan: orphanMovements,
        total: movements.length + orphanMovements.length
      },
      summary: {
        totalHistoryEntries: timeline.length,
        historyWithMovements: enrichedTimeline.filter(h => h.hasMovement).length,
        historyWithoutMovements: enrichedTimeline.filter(h => !h.hasMovement).length,
        totalMovements: movements.length,
        orphanMovements: orphanMovements.length,
        deletedHistoryEntries: timeline.filter(h => h.isDeleted).length,
        deletedMovements: movements.filter(m => m.isDeleted).length
      }
    };
  }
}
