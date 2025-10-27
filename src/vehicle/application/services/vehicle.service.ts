import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import * as XLSX from 'xlsx';
import SymbolsCatalogs from "../../../catalogs/symbols-catalogs";
import { BaseErrorException } from "../../../core/domain/exceptions/base.error.exception";
import SymbolsVehicleOwner from "../../../vehicleowner/symbols-vehicleowner";
import { VehicleModel } from "../../domain/models/vehicle.model";
import { ICatCategoryRepository } from "../../domain/repositories/cat-category.interface.repository";
import { ICatModelRepository } from "../../domain/repositories/cat-model.interface.repository";
import { IVehicleRepository } from "../../domain/repositories/vehicle.interface.repository";
import { IVehicleOwnerRepository } from "../../domain/repositories/vehicleowner.interface.repository";
import { IVehicleService } from "../../domain/services/vehicle.interface.service";
import { ICreateVehicle, IUpdatePriceByModel, IUpdateVehicle } from "../../domain/types/vehicle.type";
import SymbolsVehicle from "../../symbols-vehicle";

@Injectable()
export class VehicleService implements IVehicleService {
    constructor(
        @Inject(SymbolsVehicle.IVehicleRepository)
        private readonly vehicleRepository: IVehicleRepository,
        @Inject(SymbolsCatalogs.ICatCategoryRepository)
        private readonly catCategoryRepository: ICatCategoryRepository,
        @Inject(SymbolsVehicleOwner.IVehicleOwnerRepository)
        private readonly vehicleOwnerRepository: IVehicleOwnerRepository,
        @Inject(SymbolsCatalogs.ICatModelRepository)
        private readonly catModelRepository: ICatModelRepository,
    ) { }

    async create(vehicle: ICreateVehicle): Promise<VehicleModel> {
        const { category, owner, model, ...rest } = vehicle;
        const vehicleModel = VehicleModel.create({ ...rest, isActive: true });

        const catCategory = await this.catCategoryRepository.findById(category);

        if (!catCategory) throw new BaseErrorException('Category not found', 404);

        vehicleModel.addCategory(catCategory);

        const vehicleOwner = await this.vehicleOwnerRepository.findById(owner);

        if (!vehicleOwner) throw new BaseErrorException('Owner not found', 404);

        vehicleModel.addOwner(vehicleOwner);

        const catModel = await this.catModelRepository.findById(model);

        if (!catModel) throw new BaseErrorException('Model not found', 404);

        vehicleModel.addModel(catModel);

        return this.vehicleRepository.create(vehicleModel);
    }

    async findByDate(query: any): Promise<VehicleModel[]> {
        return this.vehicleRepository.findByDate(query);
    }

    async findById(id: string): Promise<VehicleModel> {
        return this.vehicleRepository.findById(id);
    }

    async findAll(filters: any): Promise<VehicleModel[]> {
        return this.vehicleRepository.findAll(filters);
    }

    async update(id: string, vehicle: IUpdateVehicle): Promise<VehicleModel> {
        const { category, owner, ...rest } = vehicle;
        const vehicleModel = VehicleModel.create(rest);

        if (category) {
            const catCategory = await this.catCategoryRepository.findById(category);
            if (catCategory) vehicleModel.addCategory(catCategory);
        }

        if (owner) {
            const vehicleOwner = await this.vehicleOwnerRepository.findById(owner);
            if (vehicleOwner) vehicleModel.addOwner(vehicleOwner);
        }

        if (vehicle.model) {
            const catModel = await this.catModelRepository.findById(vehicle.model);
            if (catModel) vehicleModel.addModel(catModel);
        }

        return this.vehicleRepository.update(id, vehicleModel);
    }

    async updateByModel(model: string, prices: IUpdatePriceByModel): Promise<void> {
        return this.vehicleRepository.updatePriceByModel(model, prices);
    }

    async updateReservation(vehicleId: string, originalEndDate: Date, newEndDate: Date): Promise<void> {
        return this.vehicleRepository.updateReservation(vehicleId, originalEndDate, newEndDate);
    }

    async delete(id: string): Promise<void> {
        return this.vehicleRepository.softDelete(id);
    }

    async bulkUpdatePricesFromExcel(file: any): Promise<any> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        try {
            // Leer el archivo Excel desde el buffer
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });

            // Obtener la primera hoja
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convertir a JSON
            const data: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (!data || data.length === 0) {
                throw new BadRequestException('Excel file is empty');
            }

            const results = {
                processed: 0,
                updated: 0,
                notFound: [] as string[],
                errors: [] as string[],
            };

            // Obtener todos los vehículos para hacer el mapeo
            const allVehicles = await this.vehicleRepository.findAll({});
            
            // Convertir a objetos planos para facilitar el acceso
            const vehiclesData = (allVehicles as any[]);

            // Procesar cada fila del Excel
            for (const row of data) {
                results.processed++;

                try {
                    // Mapear las columnas del Excel
                    const nombre = row['Nombre'] || row['nombre'] || row['NOMBRE'];
                    const semanal = row['Semanal'] || row['semanal'] || row['SEMANAL'];
                    const mensual = row['Mensual'] || row['mensual'] || row['MENSUAL'];

                    if (!nombre) {
                        results.errors.push(`Fila ${results.processed}: Columna 'Nombre' no encontrada`);
                        continue;
                    }

                    // Buscar el vehículo por nombre
                    const vehicle = vehiclesData.find(v => {
                        return v.name === nombre;
                    });

                    if (!vehicle) {
                        results.notFound.push(nombre);
                        continue;
                    }

                    // Preparar los datos de actualización
                    const updateData: any = {};

                    if (semanal !== undefined && semanal !== null && semanal !== '') {
                        updateData.pricePerWeek = Number(semanal);
                    }

                    if (mensual !== undefined && mensual !== null && mensual !== '') {
                        updateData.pricePerMonth = Number(mensual);
                    }

                    // Solo actualizar si hay datos para actualizar
                    if (Object.keys(updateData).length > 0) {
                        const vehicleId = vehicle._id.toString();
                        const vehicleModel = VehicleModel.create(updateData);
                        await this.vehicleRepository.update(vehicleId, vehicleModel);
                        results.updated++;
                    }

                } catch (error) {
                    results.errors.push(`Fila ${results.processed}: ${error.message}`);
                }
            }

            return {
                message: 'Bulk update completed',
                ...results,
            };

        } catch (error) {
            throw new BadRequestException(`Error processing Excel file: ${error.message}`);
        }
    }
}
