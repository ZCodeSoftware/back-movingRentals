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
      };

      const createdContract = new this.contractModel(contractData);
      const savedContract = await createdContract.save({ session });

      const historyEntry = new this.contractHistoryModel({
        contract: savedContract._id,
        performedBy: userId,
        action: ContractAction.CONTRACT_CREATED,
        details: 'El contrato fue creado.',
      });
      await historyEntry.save({ session });

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
        console.warn('[ContractRepository][applyBookingChangesFromExtension] No se pudo parsear el carrito anterior:', err);
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

    const historyEntry = new this.contractHistoryModel({
      contract: contract._id,
      performedBy: userId,
      action: ContractAction.BOOKING_MODIFIED,
      changes: [changesPayload],
      details: combinedDetails,
    });
    await historyEntry.save({ session: existingSession });

    newCartVersion.createdByEvent = historyEntry._id;
    await newCartVersion.save({ session: existingSession });

    booking.activeCartVersion = newCartVersion._id;
    booking.cart = JSON.stringify(newCartObject);

    await booking.save({ session: existingSession });
  }

  async getTimelineForContract(contractId: string): Promise<ContractHistory[]> {
    return this.contractHistoryModel
      .find({ contract: contractId })
      .sort({ createdAt: 'asc' })
      .populate('performedBy', 'name lastName email')
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
            { $project: { 'performedBy.password': 0, 'performedBy.role': 0 } },
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
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }
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
    const contracts = await this.contractModel.populate(aggregationResult, [
      { path: 'booking' },
      { path: 'reservingUser' },
      { path: 'createdByUser' },
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

      // LOG FULL UPDATE DATA
      console.log('[ContractRepository][update] contractData recibido:', JSON.stringify(contractData, null, 2));

      const { newCart, reasonForChange, ...contractUpdateData } = contractData;
      const changesToLog = [];

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

      // LOG CAMBIOS QUE SE VAN A GUARDAR EN EL MOVIMIENTO
      if (changesToLog.length > 0) {
        console.log('[ContractRepository][update] changes a guardar en historial:', JSON.stringify(changesToLog, null, 2));
        await new this.contractHistoryModel({
          contract: id,
          performedBy: userId,
          action: ContractAction.EXTENSION_UPDATED,
          changes: changesToLog,
          details: `Se actualizaron campos del contrato.`,
        }).save({ session });
      }

      if (newCart) {
        // LOG NEW CART Y SNAPSHOT
        console.log('[ContractRepository][update] newCart recibido:', JSON.stringify(newCart, null, 2));
        
        // IMPORTANTE: Obtener el carrito anterior ANTES de aplicar los cambios
        const booking = await this.bookingModel
          .findById(originalContract.booking)
          .session(session);
        const oldCartData = JSON.parse(booking.cart);
        
        // Ahora sí aplicar los cambios al booking
        await this.applyBookingChangesFromExtension(
          id,
          newCart,
          userId,
          reasonForChange,
          session,
          contractData // Nuevo: Se pasa el update completo como snapshot para el historial
        );

        // Actualizar las reservas de vehículos con el carrito anterior y el nuevo
        await this.updateVehicleReservations(oldCartData, newCart, session, id);
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
        console.warn(`Vehículo ${vehicleId} no encontrado o sin reservas al intentar liberar reserva`);
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
      console.error(`Error liberando reserva para vehículo ${vehicleId}:`, error);
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
      console.warn('[ContractRepository][createHistoryEvent] No se pudo actualizar booking.metadata:', err?.message || err);
    }

    return savedHistory;
  }

  async softDeleteHistoryEntry(
    historyId: string,
    userId: string,
    reason?: string
  ): Promise<ContractHistory> {
    const historyEntry = await this.contractHistoryModel.findById(historyId);
    
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

    historyEntry.isDeleted = true;
    historyEntry.deletedBy = new mongoose.Types.ObjectId(userId) as any;
    historyEntry.deletedAt = new Date();
    historyEntry.deletionReason = reason;

    return historyEntry.save();
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
}
