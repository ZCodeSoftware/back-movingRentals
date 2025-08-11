import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { VehicleOwnerModel } from "../../../domain/models/vehicleowner.model";
import { IVehicleOwnerRepository } from "../../../domain/repositories/vehicleowner.interface.repository";
import { VehicleOwnerSchema } from "../schemas/vehicleowner.schema";

@Injectable()
export class VehicleOwnerRepository implements IVehicleOwnerRepository {
    constructor(
        @InjectModel('VehicleOwner') private readonly vehicleownerDB: Model<VehicleOwnerSchema>
    ) { }

    async create(vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel> {
        const schema = new this.vehicleownerDB(vehicleowner.toJSON());
        const newVehicleOwner = await schema.save();

        if (!newVehicleOwner) throw new BaseErrorException(`VehicleOwner shouldn't be created`, HttpStatus.BAD_REQUEST);

        return VehicleOwnerModel.hydrate(newVehicleOwner);
    }

    async findById(id: string): Promise<VehicleOwnerModel> {
        const vehicleowner = await this.vehicleownerDB.findById(id);
        if (!vehicleowner) throw new BaseErrorException('VehicleOwner not found', HttpStatus.NOT_FOUND);
        return VehicleOwnerModel.hydrate(vehicleowner);
    }

    async findAll(): Promise<VehicleOwnerModel[]> {

        // 1. CONSTRUIR EL PIPELINE DE AGREGACIÓN
        const pipeline: mongoose.PipelineStage[] = [
            // --- (Opcional) Etapa de Filtro ($match) ---
            // Si necesitas filtrar dueños (por ejemplo, solo los activos), lo harías aquí.
            // Ejemplo: { $match: { isActive: true } }

            // --- Etapa de "Join" ($lookup) ---
            // Esta es la operación clave que une los dueños con sus vehículos.
            {
                $lookup: {
                    from: 'vehicle',           // La colección de vehículos (nombre en la DB)
                    localField: '_id',          // Campo de la colección actual (vehicle_owner)
                    foreignField: 'owner',      // Campo en 'vehicles' que referencia al ID del dueño
                    as: 'vehicles'              // Nombre del nuevo array que se añadirá a cada dueño
                }
            },
            {
                $sort: { name: 1 }
            }
        ];

        // 2. EJECUTAR LA CONSULTA DE AGREGACIÓN
        const ownersWithVehicles = await this.vehicleownerDB.aggregate(pipeline).exec();

        // 3. HIDRATAR LOS RESULTADOS USANDO TU MODELO DE DOMINIO
        // Asegúrate de que tu VehicleOwnerModel.hydrate puede manejar el nuevo array 'vehicles'.
        const ownerModels = ownersWithVehicles.map(owner =>
            VehicleOwnerModel.hydrate(owner)
        );

        return ownerModels;
    }

    async update(id: string, vehicleowner: VehicleOwnerModel): Promise<VehicleOwnerModel> {
        const updateObject = vehicleowner.toJSON();
        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => value !== null && value !== undefined)
        );
        const updated = await this.vehicleownerDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true });

        if (!updated) throw new BaseErrorException(`VehicleOwner shouldn't be updated`, HttpStatus.BAD_REQUEST);

        return VehicleOwnerModel.hydrate(updated);
    }
}
