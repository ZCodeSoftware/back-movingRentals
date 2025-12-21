import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { VehicleOwner } from "../../../../core/infrastructure/mongo/schemas/public/vehicle-owner.schema";
import { UserSchema } from "../../../../user/infrastructure/mongo/schemas/user.schema";
import { MovementModel } from "../../../domain/models/movement.model";
import { UserModel } from "../../../domain/models/user.model";
import { IMovementRepository } from "../../../domain/repositories/movement.interface.repository";
import { CreateMovementDTO } from "../../nest/dtos/movement.dto";
import { MovementSchema } from "../schemas/movement.schema";

@Injectable()
export class MovementRepository implements IMovementRepository {
    constructor(
        @InjectModel('Movement') private readonly movementDB: Model<MovementSchema>,
        @InjectModel('User') private readonly userDB: Model<UserSchema>,
        @InjectModel(VehicleOwner.name) private readonly vehicleOwnerDB: Model<VehicleOwner>,
    ) { }

    async create(movement: CreateMovementDTO): Promise<MovementModel> {
        let beneficiaryModel: 'User' | 'VehicleOwner' | undefined;
        if (movement.beneficiary) {
            const user = await this.userDB.findById(movement.beneficiary);
            if (!user) {
                const vehicleOwner = await this.vehicleOwnerDB.findById(movement.beneficiary);
                if (!vehicleOwner) {
                    throw new BaseErrorException('Beneficiary not found', HttpStatus.NOT_FOUND)
                } else {
                    beneficiaryModel = 'VehicleOwner';
                }
            } else {
                beneficiaryModel = 'User';
            }
        }

        const movementToSave = { ...movement, beneficiaryModel };
        const schema = new this.movementDB(movementToSave);
        const newMovement = await schema.save();

        if (!newMovement) throw new BaseErrorException(`Movement shouldn't be created`, HttpStatus.BAD_REQUEST);

        // Populate the created movement with user and role data
        const populatedMovement = await this.movementDB.findById(newMovement._id)
            .populate({
                path: 'createdBy',
                select: '-password',
                populate: { path: 'role' }
            })
            .populate({
                path: 'beneficiary',
                select: '-password'
            });

        return MovementModel.hydrate(populatedMovement);
    }

    async update(id: string, movement: Partial<CreateMovementDTO>): Promise<MovementModel> {
        let beneficiaryModel: 'User' | 'VehicleOwner' | undefined;
        if (movement.beneficiary) {
            const user = await this.userDB.findById(movement.beneficiary);
            if (!user) {
                const vehicleOwner = await this.vehicleOwnerDB.findById(movement.beneficiary);
                if (!vehicleOwner) {
                    throw new BaseErrorException('Beneficiary not found', HttpStatus.NOT_FOUND)
                } else {
                    beneficiaryModel = 'VehicleOwner';
                }
            } else {
                beneficiaryModel = 'User';
            }
        }

        const updateData: any = { ...movement };
        if (beneficiaryModel) {
            updateData.beneficiaryModel = beneficiaryModel;
        }

        const updated = await this.movementDB.findByIdAndUpdate(id, updateData, { new: true })
            .populate({
                path: 'createdBy',
                select: '-password',
                populate: { path: 'role' }
            })
            .populate({
                path: 'beneficiary',
                select: '-password'
            });

        if (!updated) throw new BaseErrorException('Movement not found', HttpStatus.NOT_FOUND);

        return MovementModel.hydrate(updated);
    }

    async findById(id: string): Promise<MovementModel> {
        const movement = await this.movementDB.findOne({ _id: id, $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }] })
            .populate({
                path: 'createdBy',
                select: '-password',
                populate: { path: 'role' }
            })
            .populate({
                path: 'beneficiary',
                select: '-password'
            });
        if (!movement) throw new BaseErrorException('Movement not found', HttpStatus.NOT_FOUND);
        return MovementModel.hydrate(movement);
    }

    async findAll(filters: any, userId: string): Promise<{
        data: MovementModel[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }> {
        const { page = 1, limit = 10, startDate, endDate, vehicleId, detail } = filters;

        const user = await this.userDB.findById(userId).populate('role');

        if (!user) throw new BaseErrorException('User not found', HttpStatus.NOT_FOUND);

        const userModel = UserModel.hydrate(user);

        const pageNumber = parseInt(page as string, 10) || 1;
        const limitNumber = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        const query: any = {};

        if (userModel.toJSON().role.name === TypeRoles.SELLER || userModel.toJSON().role.name === TypeRoles.SUPERVISOR) {
            query.createdBy = userModel.toJSON()._id;
        }

        if (vehicleId) {
            query.vehicle = vehicleId;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setUTCHours(23, 59, 59, 999);
                query.date.$lte = endOfDay;
            }
        }

        // Filtro por detalle (case-insensitive)
        if (detail) {
            query.detail = { $regex: detail, $options: 'i' };
        }

        const otherFilters = { ...filters };
        delete otherFilters.page;
        delete otherFilters.limit;
        delete otherFilters.startDate;
        delete otherFilters.endDate;
        delete otherFilters.vehicleId;
        delete otherFilters.detail;

        const finalQuery = { ...query, ...otherFilters };

        // Excluir eliminados por defecto en listados
        const notDeleted = { isDeleted: { $ne: true } };

        // Excluir movimientos relacionados con contratos/rentas
        // Solo excluimos los que tienen un contrato asociado, ya que esos son cargos al cliente
        const notContractRelated = {
            contract: { $exists: false }
        };

        const [movements, totalItems] = await Promise.all([
            this.movementDB.find({ $and: [finalQuery, notDeleted, notContractRelated] })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .populate({
                    path: 'createdBy',
                    select: '-password',
                    populate: { path: 'role' }
                })
                .populate({
                    path: 'beneficiary',
                    select: '-password'
                }),
            this.movementDB.countDocuments({ $and: [finalQuery, notDeleted, notContractRelated] })
        ]);

        const totalPages = Math.ceil(totalItems / limitNumber);

        return {
            data: movements?.map(movement => MovementModel.hydrate(movement)),
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalItems,
                itemsPerPage: limitNumber,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1,
            },
        };
    }

    async softDeleteMovement(
        movementId: string,
        userId: string,
        reason?: string
    ): Promise<MovementModel> {
        const movement = await this.movementDB.findById(movementId).populate('createdBy').populate('beneficiary').populate('vehicle').populate('contract');

        if (!movement) {
            throw new BaseErrorException('Movimiento no encontrado', HttpStatus.NOT_FOUND);
        }

        if (movement.isDeleted) {
            throw new BaseErrorException('El movimiento ya está eliminado', HttpStatus.BAD_REQUEST);
        }

        movement.isDeleted = true;
        movement.deletedBy = userId as any;
        movement.deletedAt = new Date();
        movement.deletionReason = reason;

        const savedMovement = await movement.save();

        // Guardar el contractId antes de procesar el histórico
        const contractId = (movement as any).contract?._id || (movement as any).contract;

        // Si el movimiento tiene una entrada relacionada en el histórico del contrato, eliminarla también
        if (movement.contractHistoryEntry) {
            try {
                const ContractHistory = this.movementDB.db.model('ContractHistory');
                const historyEntry = await ContractHistory.findById(movement.contractHistoryEntry);
                
                if (historyEntry && !historyEntry.isDeleted) {
                    console.log(`[MovementRepository] Eliminando entrada del histórico del contrato relacionada: ${movement.contractHistoryEntry}`);
                    
                    // Obtener información del usuario para deletedByInfo
                    const User = this.movementDB.db.model('User');
                    const userInfo: any = await User.findById(userId).select('name lastName email').lean();
                    
                    const deletedByInfoValue = userInfo 
                        ? `${userInfo.name || ''} ${userInfo.lastName || ''}`.trim() + (userInfo.email ? ` - ${userInfo.email}` : '')
                        : 'Usuario desconocido';
                    
                    historyEntry.isDeleted = true;
                    historyEntry.deletedBy = userId;
                    historyEntry.deletedByInfo = deletedByInfoValue;
                    historyEntry.deletedAt = new Date();
                    historyEntry.deletionReason = reason || 'Eliminado automáticamente al eliminar el movimiento relacionado';
                    
                    await historyEntry.save();
                    console.log(`[MovementRepository] Entrada del histórico eliminada exitosamente`);
                }
            } catch (error) {
                console.error('[MovementRepository] Error al eliminar entrada del histórico del contrato:', error);
                // No lanzar error para no interrumpir la eliminación del movimiento
            }
        }

        // Recalcular los totales del booking si el movimiento está asociado a un contrato
        if (contractId) {
            try {
                console.log(`[MovementRepository] Recalculando totales del booking para el contrato: ${contractId}`);
                
                // Importar dinámicamente el servicio de contratos para evitar dependencias circulares
                const Contract = this.movementDB.db.model('Contract');
                const contract = await Contract.findById(contractId).populate('booking');
                
                if (contract && contract.booking) {
                    // Obtener el timeline del contrato
                    const ContractHistory = this.movementDB.db.model('ContractHistory');
                    const timeline = await ContractHistory.find({ 
                        contract: contractId 
                    })
                    .populate('eventType')
                    .populate('createdBy', 'name lastName email')
                    .sort({ createdAt: 1 })
                    .lean();
                    
                    // Calcular los nuevos totales usando la misma lógica que BookingTotalsService
                    const originalTotal = contract.booking.total || 0;
                    let netTotal = originalTotal;
                    
                    for (const historyEntry of timeline) {
                        // Ignorar movimientos eliminados
                        if (historyEntry.isDeleted === true) {
                            continue;
                        }
                        
                        // Verificar si el evento tiene metadatos con información monetaria
                        if (historyEntry.eventMetadata && historyEntry.eventMetadata.amount) {
                            const amount = parseFloat(historyEntry.eventMetadata.amount);
                            
                            if (!isNaN(amount) && amount !== 0) {
                                // EXCEPCIÓN: NO sumar el delivery al netTotal porque ya viene incluido en el total del booking
                                const isDeliveryEvent = historyEntry.eventType?.name === 'DELIVERY';
                                
                                if (!isDeliveryEvent) {
                                    // Determinar la dirección del movimiento
                                    const eventName = historyEntry.eventType?.name || '';
                                    const direction = this.determineMovementDirection(eventName);
                                    
                                    // Aplicar el ajuste al total neto
                                    if (direction === 'IN') {
                                        netTotal += amount;
                                    } else {
                                        netTotal -= amount;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Redondear a 2 decimales
                    netTotal = Math.round(netTotal * 100) / 100;
                    
                    // Actualizar el contrato con los nuevos totales
                    contract.bookingTotals = {
                        originalTotal,
                        netTotal
                    };
                    
                    await contract.save();
                    console.log(`[MovementRepository] Totales del booking recalculados: originalTotal=${originalTotal}, netTotal=${netTotal}`);
                }
            } catch (error) {
                console.error('[MovementRepository] Error al recalcular totales del booking:', error);
                // No lanzar error para no interrumpir la eliminación del movimiento
            }
        }

        return MovementModel.hydrate(savedMovement);
    }

    /**
     * Determina la dirección del movimiento basándose en el tipo de evento
     */
    private determineMovementDirection(eventName: string): 'IN' | 'OUT' {
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

        // Por defecto, considerar como ingreso
        return 'IN';
    }

    async restoreMovement(movementId: string): Promise<MovementModel> {
        // Buscar incluyendo los eliminados
        const movement = await this.movementDB.findOne({
            _id: movementId,
            isDeleted: true
        });

        if (!movement) {
            throw new BaseErrorException('Movimiento eliminado no encontrado', HttpStatus.NOT_FOUND);
        }

        movement.isDeleted = false;
        movement.deletedBy = undefined;
        movement.deletedAt = undefined;
        movement.deletionReason = undefined;

        const savedMovement = await movement.save();

        // Si el movimiento tiene una entrada relacionada en el histórico del contrato, restaurarla también
        if (movement.contractHistoryEntry) {
            try {
                const ContractHistory = this.movementDB.db.model('ContractHistory');
                const historyEntry = await ContractHistory.findById(movement.contractHistoryEntry);
                
                if (historyEntry && historyEntry.isDeleted) {
                    console.log(`[MovementRepository] Restaurando entrada del histórico del contrato relacionada: ${movement.contractHistoryEntry}`);
                    
                    historyEntry.isDeleted = false;
                    historyEntry.deletedBy = undefined;
                    historyEntry.deletedByInfo = undefined;
                    historyEntry.deletedAt = undefined;
                    historyEntry.deletionReason = undefined;
                    
                    await historyEntry.save();
                    console.log(`[MovementRepository] Entrada del histórico restaurada exitosamente`);
                }
            } catch (error) {
                console.error('[MovementRepository] Error al restaurar entrada del histórico del contrato:', error);
                // No lanzar error para no interrumpir la restauración del movimiento
            }
        }

        return MovementModel.hydrate(savedMovement);
    }

    async getDeletedMovements(filters: any): Promise<MovementModel[]> {
        const query: any = { isDeleted: true };

        // Aplicar filtros si se proporcionan
        if (filters.vehicle) {
            query.vehicle = filters.vehicle;
        }
        if (filters.beneficiary) {
            query.beneficiary = filters.beneficiary;
        }
        if (filters.type) {
            query.type = filters.type;
        }

        const movements = await this.movementDB
            .find(query)
            .sort({ deletedAt: -1 })
            .populate({
                path: 'createdBy',
                select: 'name lastName email'
            })
            .populate({
                path: 'deletedBy',
                select: 'name lastName email'
            })
            .populate('beneficiary')
            .populate('vehicle');

        return movements.map(movement => MovementModel.hydrate(movement));
    }
}
