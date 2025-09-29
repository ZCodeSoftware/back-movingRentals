import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

    const newCartVersion = new this.cartVersionModel({
      booking: booking._id,
      version: newVersionNumber,
      data: newCartObject,
    });

    const historyEntry = new this.contractHistoryModel({
      contract: contract._id,
      performedBy: userId,
      action: ContractAction.BOOKING_MODIFIED,
      changes: [
        {
          field: 'activeCartVersion',
          oldValue: booking.activeCartVersion,
          newValue: newCartVersion._id,
        },
      ],
      details,
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
      matchConditions.status = new mongoose.Types.ObjectId(filters.status);
    }
    if (filters.reservingUser) {
      const regex = new RegExp(escapeRegex(filters.reservingUser), 'i');
      matchConditions['reservingUserData.email'] = regex;
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
      matchConditions.createdByUser = new mongoose.Types.ObjectId(
        filters.createdByUser,
      );
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
    const contractModels = contracts.map((contract) =>
      ContractModel.hydrate(contract),
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

      if (changesToLog.length > 0) {
        await new this.contractHistoryModel({
          contract: id,
          performedBy: userId,
          action: ContractAction.EXTENSION_UPDATED,
          changes: changesToLog,
          details: `Se actualizaron campos del contrato.`,
        }).save({ session });
      }

      if (newCart) {
        // Pasamos la sesión, y esta función ahora OPERA dentro de ella, pero no la finaliza.
        await this.applyBookingChangesFromExtension(
          id,
          newCart,
          userId,
          reasonForChange,
          session,
        );

        const booking = await this.bookingModel
          .findById(originalContract.booking)
          .session(session);
        const oldCartData = JSON.parse(booking.cart);
        await this.updateVehicleReservations(oldCartData, newCart, session);
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

      // Commit es ahora el último paso dentro del bloque 'try'.
      await session.commitTransaction();
    } catch (error) {
      // Cualquier error en el bloque 'try' provocará un abort.
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
  ): Promise<void> {
    if (!newCart.vehicles || newCart.vehicles.length === 0) return;

    const oldVehiclesMap = new Map(
      (oldCart.vehicles || []).map((v: CartVehicleItem) => {
        const id =
          typeof v.vehicle === 'string' ? v.vehicle : v.vehicle._id.toString();
        return [id, v];
      }),
    );

    for (const newVehicleItem of newCart.vehicles) {
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

    return historyEntry.save();
  }
}
