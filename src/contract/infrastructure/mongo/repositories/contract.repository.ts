import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import { Booking } from '../../../../core/infrastructure/mongo/schemas/public/booking.schema';
import { CartVersion } from '../../../../core/infrastructure/mongo/schemas/public/cart-version.version';
import { Cart } from '../../../../core/infrastructure/mongo/schemas/public/cart.schema';
import { ContractAction, ContractHistory } from '../../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { Contract } from '../../../../core/infrastructure/mongo/schemas/public/contract.schema';
import { Reservation, Vehicle } from '../../../../core/infrastructure/mongo/schemas/public/vehicle.schema';
import { ContractModel } from '../../../domain/models/contract.model';
import { IContractFilters, IContractRepository, IPaginatedContractResponse } from '../../../domain/repositories/contract.interface.repository';
import { UpdateContractDTO } from '../../nest/dtos/contract.dto';

interface CartVehicleItem {
  vehicle: string | { _id: string }; // Puede ser un string o un objeto con _id
  dates: {
    start: string | Date;
    end: string | Date;
  };
  // ... otros campos que puedas necesitar
}

interface CartWithVehicles {
  vehicles: CartVehicleItem[];
}

// Interfaz para la reserva, asegurándonos de que tenga _id.
// Si tu tipo 'Reservation' de Mongoose ya lo tiene, puedes omitir esta.
interface ReservationWithId extends Reservation {
  _id: mongoose.Types.ObjectId;
}

@Injectable()
export class ContractRepository implements IContractRepository {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel(Contract.name) private readonly contractModel: Model<Contract>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(CartVersion.name) private readonly cartVersionModel: Model<CartVersion>,
    @InjectModel(ContractHistory.name) private readonly contractHistoryModel: Model<ContractHistory>,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<Vehicle>,
  ) { }

  async create(contract: ContractModel, userId: string): Promise<ContractModel> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const contractData = {
        booking: contract.booking?.id?.toValue() || contract.booking,
        reservingUser: contract.reservingUser?.id?.toValue() || contract.reservingUser,
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
        { path: 'booking' }, { path: 'reservingUser' }, { path: 'createdByUser' },
        { path: 'status' }, { path: 'extension.paymentMethod' }, { path: 'extension.extensionStatus' }
      ]);

      return ContractModel.hydrate(savedContract.toObject());
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
 * Aplica cambios al carrito de una reserva como resultado de una extensión de contrato,
 * manteniendo compatibilidad total con el frontend y creando un historial de cambios robusto.
 *
 * @param contractId El ID del contrato que se está modificando.
 * @param newCartObject El objeto completo del nuevo estado del carrito.
 * @param userId El ID del usuario que realiza la operación.
 * @param details Una descripción textual del cambio para el historial.
 */
  async applyBookingChangesFromExtension(
    contractId: string,
    newCartObject: Cart,
    userId: string,
    details: string,
    existingSession?: mongoose.ClientSession,
  ): Promise<void> {
    const session = existingSession || await this.connection.startSession();
    if (!existingSession) {
      session.startTransaction();
    }

    try {
      const contract = await this.contractModel.findById(contractId).session(session);
      if (!contract) {
        throw new NotFoundException('Contrato no encontrado.');
      }

      const booking = await this.bookingModel.findById(contract.booking).session(session);
      if (!booking) {
        throw new NotFoundException('Reserva asociada no encontrada.');
      }

      // Paso 1: Crear la nueva VERSIÓN ESTRUCTURADA del carrito
      const lastVersion = await this.cartVersionModel.findOne({ booking: booking._id }).sort({ version: -1 });
      const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

      const newCartVersion = new this.cartVersionModel({
        booking: booking._id,
        version: newVersionNumber,
        data: newCartObject, // Se guarda el objeto estructurado
      });

      // Paso 2: Crear el registro de HISTORIAL que justifica el cambio
      const historyEntry = new this.contractHistoryModel({
        contract: contract._id,
        performedBy: userId,
        action: ContractAction.BOOKING_MODIFIED,
        changes: [{
          field: 'activeCartVersion',
          oldValue: booking.activeCartVersion,
          newValue: newCartVersion._id,
        }],
        details,
      });
      await historyEntry.save({ session });

      // Vinculamos el historial a la versión para una trazabilidad completa
      newCartVersion.createdByEvent = historyEntry._id;
      await newCartVersion.save({ session });

      // Paso 3: ACTUALIZAR la reserva (La parte clave del enfoque híbrido)
      booking.activeCartVersion = newCartVersion._id; // Puntero para el backend
      booking.cart = JSON.stringify(newCartObject);   // String para el frontend

      await booking.save({ session });

      // Si todo fue bien, se confirman todos los cambios.
      await session.commitTransaction();
    } catch (error) {
      // Si algo falla, se revierten todos los cambios.
      await session.abortTransaction();
      console.error("Error en la transacción de actualización de contrato, cambios revertidos:", error);
      throw error; // Relanzar el error para que el controlador lo maneje
    } finally {
      // Siempre cerrar la sesión
      session.endSession();
    }
  }

  /**
   * Obtiene el historial de cambios para un contrato específico.
   *
   * @param contractId El ID del contrato.
   * @returns Un array de eventos de historial ordenados cronológicamente.
   */
  async getTimelineForContract(contractId: string): Promise<ContractHistory[]> {
    return this.contractHistoryModel
      .find({ contract: contractId })
      .sort({ createdAt: 'asc' })
      .populate('performedBy', 'name lastName email') // Traer datos útiles del usuario
      .exec();
  }

  async findById(id: string): Promise<ContractModel> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`El ID del contrato "${id}" no es válido.`);
    }

    // --- EL CAMBIO CLAVE: Añade ': PipelineStage[]' ---
    const pipeline: mongoose.PipelineStage[] = [
      // Etapa 1: Encontrar el contrato específico por su ID
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id)
        }
      },
      // Etapa 2: Unir con la colección de historial
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
            { $unwind: { path: '$performedBy', preserveNullAndEmptyArrays: true } },
            { $project: { 'performedBy.password': 0, 'performedBy.role': 0 } } // Excluir campos sensibles
          ]
        }
      },
      // Etapa 3: Popular los otros campos
      {
        $lookup: { from: 'booking', localField: 'booking', foreignField: '_id', as: 'booking' }
      },
      {
        $lookup: { from: 'users', localField: 'reservingUser', foreignField: '_id', as: 'reservingUser' }
      },
      {
        $lookup: { from: 'users', localField: 'createdByUser', foreignField: '_id', as: 'createdByUser' }
      },
      {
        $lookup: { from: 'cat_status', localField: 'status', foreignField: '_id', as: 'status' }
      },
      // Descomprimir los arrays
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

  async findAll(filters: IContractFilters): Promise<IPaginatedContractResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Join with booking collection to access bookingNumber
    pipeline.push({
      $lookup: {
        from: 'booking',
        localField: 'booking',
        foreignField: '_id',
        as: 'bookingData'
      }
    });

    // Unwind the booking data
    pipeline.push({
      $unwind: '$bookingData'
    });

    // Build match conditions
    const matchConditions: any = {};

    if (filters.bookingNumber) {
      matchConditions['bookingData.bookingNumber'] = filters.bookingNumber;
    }

    if (filters.status) {
      matchConditions.status = new mongoose.Types.ObjectId(filters.status);
    }

    if (filters.reservingUser) {
      matchConditions.reservingUser = new mongoose.Types.ObjectId(filters.reservingUser);
    }

    if (filters.createdByUser) {
      matchConditions.createdByUser = new mongoose.Types.ObjectId(filters.createdByUser);
    }

    // Add match stage if there are conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sort stage
    pipeline.push({ $sort: { createdAt: -1 } });

    // Execute aggregation for total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.contractModel.aggregate(countPipeline).exec();
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination stages
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const aggregationResult = await this.contractModel.aggregate(pipeline).exec();

    // Populate the results
    const contracts = await this.contractModel.populate(aggregationResult, [
      { path: 'booking' },
      { path: 'reservingUser' },
      { path: 'createdByUser' },
      { path: 'status' },
      { path: 'extension.paymentMethod' },
      { path: 'extension.extensionStatus' }
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const contractModels = contracts.map(contract =>
      ContractModel.hydrate(contract)
    );

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

  async update(id: string, contractData: UpdateContractDTO, userId: string): Promise<ContractModel> {
    const session = await this.connection.startSession();
    let updatedContract; // Declarado fuera para ser accesible después de la transacción

    try {
      session.startTransaction();

      // 1. FETCH: Obtenemos el estado original del contrato DENTRO de la sesión.
      const originalContract = await this.contractModel.findById(id).session(session);
      if (!originalContract) {
        throw new NotFoundException('Contract not found');
      }

      // 2. PREPARACIÓN: Separamos los datos para un manejo claro.
      const { newCart, reasonForChange, ...contractUpdateData } = contractData;
      const changesToLog = [];

      // 3. COMPARE: Detectamos cada cambio en los campos del contrato.
      if (contractUpdateData.status && originalContract.status.toString() !== contractUpdateData.status) {
        changesToLog.push({ field: 'status', oldValue: originalContract.status, newValue: contractUpdateData.status });
      }
      if (contractUpdateData.reservingUser && originalContract.reservingUser.toString() !== contractUpdateData.reservingUser) {
        changesToLog.push({ field: 'reservingUser', oldValue: originalContract.reservingUser, newValue: contractUpdateData.reservingUser });
      }
      if (contractUpdateData.extension) {
        const originalExtensionStr = JSON.stringify(originalContract.extension || {});
        const newExtensionStr = JSON.stringify(contractUpdateData.extension);
        if (originalExtensionStr !== newExtensionStr) {
          changesToLog.push({ field: 'extension', oldValue: originalContract.extension, newValue: contractUpdateData.extension });
        }
      }

      // 4. LOG: Si hubo cambios en los campos del contrato, los registramos.
      if (changesToLog.length > 0) {
        await new this.contractHistoryModel({
          contract: id,
          performedBy: userId,
          action: ContractAction.EXTENSION_UPDATED,
          changes: changesToLog,
          details: `Se actualizaron campos del contrato.`,
        }).save({ session });
      }

      // 5. UPDATE (CARRITO Y VEHÍCULOS): Si hay cambios en el carrito, se manejan por separado.
      if (newCart) {
        if (!reasonForChange) {
          throw new Error("Debe proporcionar un motivo ('reasonForChange') al modificar el carrito.");
        }

        // La llamada a esta función crea la nueva CartVersion y actualiza el Booking
        await this.applyBookingChangesFromExtension(id, newCart, userId, reasonForChange, session);

        // Obtenemos el carrito ANTERIOR (que está en el booking ANTES de la actualización) para comparar fechas
        const booking = await this.bookingModel.findById(originalContract.booking).session(session);
        const oldCartData = JSON.parse(booking.cart);
        await this.updateVehicleReservations(oldCartData, newCart, session);
      }

      // 6. UPDATE (CONTRATO): Actualizamos el documento principal del contrato.
      updatedContract = await this.contractModel.findByIdAndUpdate(
        id,
        contractUpdateData,
        { new: true, session: session }
      );

      if (!updatedContract) {
        // Si la actualización devuelve null, algo salió mal.
        throw new InternalServerErrorException('No se pudo actualizar el contrato durante la transacción.');
      }

      // 7. COMMIT: Confirmamos la transacción.
      await session.commitTransaction();

    } catch (error) {
      // Si cualquier operación dentro del 'try' falla, se entra aquí para revertir todo.
      await session.abortTransaction();
      console.error(`Error en la transacción de actualización del contrato ${id}, cambios revertidos:`, error);
      throw error;
    } finally {
      // Siempre nos aseguramos de que la sesión se cierre.
      session.endSession();
    }

    // 8. POPULATE Y HYDRATE: Fuera de la transacción.
    // Esto se hace con el documento ya actualizado y la transacción cerrada.
    await updatedContract.populate([
      { path: 'booking' }, { path: 'reservingUser' }, { path: 'createdByUser' },
      { path: 'status' }, { path: 'extension.paymentMethod' }, { path: 'extension.extensionStatus' }
    ]);

    return ContractModel.hydrate(updatedContract.toObject());
  }

  private async updateVehicleReservations(oldCart: CartWithVehicles, newCart: CartWithVehicles, session: mongoose.ClientSession): Promise<void> {
    if (!newCart.vehicles || newCart.vehicles.length === 0) return;

    // El tipado fuerte aquí permite que TypeScript autocomplete y valide las propiedades
    const oldVehiclesMap = new Map((oldCart.vehicles || []).map((v: CartVehicleItem) => {
      const id = typeof v.vehicle === 'string' ? v.vehicle : v.vehicle._id.toString();
      return [id, v];
    }));

    for (const newVehicleItem of newCart.vehicles) {
      const vehicleId = typeof newVehicleItem.vehicle === 'string' ? newVehicleItem.vehicle : newVehicleItem.vehicle._id.toString();
      const oldVehicleItem = oldVehiclesMap.get(vehicleId);

      // Ahora TypeScript sabe que .dates.end existe
      if (oldVehicleItem && newVehicleItem.dates.end.toString() !== oldVehicleItem.dates.end.toString()) {
        const originalEndDate = new Date(oldVehicleItem.dates.end);
        const newEndDate = new Date(newVehicleItem.dates.end);

        const vehicle = await this.vehicleModel.findById(vehicleId).session(session);
        if (!vehicle || !vehicle.reservations) continue;

        // Le decimos a TypeScript que el array es de tipo ReservationWithId
        const reservationsTyped = vehicle.reservations as ReservationWithId[];

        const reservationIndex = reservationsTyped.findIndex(reservation => {
          const reservationEndTime = new Date(reservation.end).getTime();
          const originalEndTime = originalEndDate.getTime();
          return Math.abs(reservationEndTime - originalEndTime) <= 60000;
        });

        if (reservationIndex === -1) {
          console.warn(`No se encontró reserva coincidente para el vehículo ${vehicleId} con fecha ${originalEndDate}`);
          continue;
        }

        // Ahora TypeScript sabe que ._id existe en el elemento del array
        const reservationToUpdateId = reservationsTyped[reservationIndex]._id;

        await this.vehicleModel.updateOne(
          { _id: vehicleId, "reservations._id": reservationToUpdateId },
          { $set: { "reservations.$.end": newEndDate } },
          { session }
        );
      }
    }
  }

  async createHistoryEvent(
    contractId: string,
    userId: string,
    eventType: string, // <-- Ahora es un string libre
    details: string,
    metadata?: Record<string, any>
  ): Promise<ContractHistory> {

    const historyEntry = new this.contractHistoryModel({
      contract: contractId,
      performedBy: userId,
      action: ContractAction.NOTE_ADDED, // Usamos una acción genérica del sistema
      eventType: eventType,              // Guardamos el tipo de evento personalizado
      details: details,
      eventMetadata: metadata,
      changes: [],
    });

    return historyEntry.save();
  }
}