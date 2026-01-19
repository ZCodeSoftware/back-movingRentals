import { Inject, Injectable } from "@nestjs/common";
import { MovementModel } from "../../domain/models/movement.model";
import { IMovementRepository } from "../../domain/repositories/movement.interface.repository";
import { IMovementService } from "../../domain/services/movement.interface.service";
import { ICreateMovement } from "../../domain/types/movement.type";
import SymbolsMovement from "../../symbols-movement";

@Injectable()
export class MovementService implements IMovementService {
    constructor(
        @Inject(SymbolsMovement.IMovementRepository)
        private readonly movementRepository: IMovementRepository
    ) { }

    async create(movement: ICreateMovement, userId: string): Promise<MovementModel> {
        return this.movementRepository.create({ ...movement, createdBy: userId });
    }

    async update(id: string, movement: Partial<ICreateMovement>): Promise<MovementModel> {
        return this.movementRepository.update(id, movement);
    }

    async findById(id: string): Promise<MovementModel> {
        return this.movementRepository.findById(id);
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
        return this.movementRepository.findAll(filters, userId);
    }

    async deleteMovement(movementId: string, userId: string, reason?: string): Promise<MovementModel> {
        return this.movementRepository.softDeleteMovement(movementId, userId, reason);
    }

    async restoreMovement(movementId: string): Promise<MovementModel> {
        return this.movementRepository.restoreMovement(movementId);
    }

    async getDeletedMovements(filters: any): Promise<MovementModel[]> {
        return this.movementRepository.getDeletedMovements(filters);
    }

    async exportMovementsToExcel(filters: any): Promise<Buffer> {
        const XLSX = require('xlsx');

        console.log('[ExportMovements] Iniciando exportación de movimientos de caja...');
        const startTime = Date.now();

        // Obtener todos los movimientos sin paginación
        const allFilters = { ...filters, page: 1, limit: 999999 };
        const result = await this.movementRepository.findAll(allFilters, null);
        const movements = result.data;

        console.log(`[ExportMovements] ${movements.length} movimientos obtenidos en ${Date.now() - startTime}ms`);

        const rows = [];

        for (const movement of movements) {
            try {
                const movementData: any = movement.toJSON ? movement.toJSON() : movement;

                const row = {
                    'Fecha': movementData.date ? new Date(movementData.date).toLocaleString('es-MX', {
                        timeZone: 'America/Cancun',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }) : 'N/A',
                    'Tipo': movementData.type || 'N/A',
                    'Dirección': movementData.direction === 'IN' ? 'INGRESO' : 'EGRESO',
                    'Detalle': movementData.detail || 'N/A',
                    'Monto': movementData.amount || 0,
                    'Método de Pago': movementData.paymentMethod || 'N/A',
                    'Vehículo': movementData.vehicle?.name || movementData.vehicle?.tag || 'N/A',
                    'Beneficiario': typeof movementData.beneficiary === 'object' 
                        ? movementData.beneficiary?.name || 'N/A' 
                        : movementData.beneficiary || 'N/A',
                    'Creado Por': movementData.createdBy?.name || movementData.createdBy?.email || 'N/A'
                };

                rows.push(row);
            } catch (error) {
                console.error('Error procesando movimiento:', error);
            }
        }

        console.log(`[ExportMovements] ${rows.length} filas procesadas en ${Date.now() - startTime}ms`);

        // Crear el libro de Excel
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos de Caja');

        // Ajustar anchos de columna
        const columnWidths = [
            { wch: 20 }, // Fecha
            { wch: 25 }, // Tipo
            { wch: 12 }, // Dirección
            { wch: 40 }, // Detalle
            { wch: 15 }, // Monto
            { wch: 20 }, // Método de Pago
            { wch: 20 }, // Vehículo
            { wch: 30 }, // Beneficiario
            { wch: 25 }  // Creado Por
        ];
        worksheet['!cols'] = columnWidths;

        // Generar el buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        console.log(`[ExportMovements] Exportación completada en ${Date.now() - startTime}ms`);

        return excelBuffer;
    }
}
