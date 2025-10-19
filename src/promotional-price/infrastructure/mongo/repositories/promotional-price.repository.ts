import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { PromotionalPrice } from '../../../../core/infrastructure/mongo/schemas/public/promotional-price.schema';
import { PromotionalPriceModel } from '../../../domain/models/promotional-price.model';
import { IPromotionalPriceRepository } from '../../../domain/repositories/promotional-price.interface.repository';

@Injectable()
export class PromotionalPriceRepository implements IPromotionalPriceRepository {
    constructor(
        @InjectModel(PromotionalPrice.name)
        private readonly promotionalPriceModel: Model<PromotionalPrice>,
    ) {}

    async create(promotionalPrice: PromotionalPriceModel): Promise<PromotionalPriceModel> {
        try {
            const schema = new this.promotionalPriceModel(promotionalPrice.toJSON());
            const saved = await schema.save();

            if (!saved) {
                throw new BaseErrorException(
                    "Couldn't save the promotional price",
                    HttpStatus.BAD_REQUEST,
                );
            }

            return PromotionalPriceModel.hydrate(saved);
        } catch (error) {
            throw new BaseErrorException(
                error.message,
                error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findById(id: string): Promise<PromotionalPriceModel> {
        try {
            const found = await this.promotionalPriceModel
                .findById(id)
                .populate('model');

            if (!found) {
                throw new BaseErrorException(
                    `Promotional price with ID ${id} not found`,
                    HttpStatus.NOT_FOUND,
                );
            }

            return PromotionalPriceModel.hydrate(found);
        } catch (error) {
            throw new BaseErrorException(
                error.message,
                error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findAll(filters: any): Promise<PromotionalPriceModel[]> {
        try {
            const query: any = {};

            if (filters.model) {
                query.model = filters.model;
            }

            if (filters.isActive !== undefined) {
                query.isActive = filters.isActive;
            }

            // Filtrar por rango de fechas
            if (filters.startDate || filters.endDate) {
                query.$or = [];
                
                if (filters.startDate && filters.endDate) {
                    // Buscar promociones que se solapen con el rango dado
                    query.$or.push({
                        $and: [
                            { startDate: { $lte: new Date(filters.endDate) } },
                            { endDate: { $gte: new Date(filters.startDate) } }
                        ]
                    });
                } else if (filters.startDate) {
                    query.$or.push({ endDate: { $gte: new Date(filters.startDate) } });
                } else if (filters.endDate) {
                    query.$or.push({ startDate: { $lte: new Date(filters.endDate) } });
                }
            }

            const found = await this.promotionalPriceModel
                .find(query)
                .populate('model')
                .sort({ startDate: -1 });

            return found.map((item) => PromotionalPriceModel.hydrate(item));
        } catch (error) {
            throw new BaseErrorException(
                error.message,
                error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findByModelAndDate(modelId: string, date: Date): Promise<PromotionalPriceModel | null> {
        try {
            const found = await this.promotionalPriceModel
                .findOne({
                    model: modelId,
                    startDate: { $lte: date },
                    endDate: { $gte: date },
                    isActive: true,
                })
                .populate('model')
                .sort({ createdAt: -1 }); // Si hay múltiples, tomar la más reciente

            if (!found) {
                return null;
            }

            return PromotionalPriceModel.hydrate(found);
        } catch (error) {
            throw new BaseErrorException(
                error.message,
                error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async update(id: string, promotionalPrice: PromotionalPriceModel): Promise<PromotionalPriceModel> {
        try {
            const updated = await this.promotionalPriceModel
                .findByIdAndUpdate(id, promotionalPrice.toJSON(), { new: true })
                .populate('model');

            if (!updated) {
                throw new BaseErrorException(
                    `Promotional price with ID ${id} not found`,
                    HttpStatus.NOT_FOUND,
                );
            }

            return PromotionalPriceModel.hydrate(updated);
        } catch (error) {
            throw new BaseErrorException(
                error.message,
                error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async softDelete(id: string): Promise<void> {
        try {
            const updated = await this.promotionalPriceModel.findByIdAndUpdate(
                id,
                { isDeleted: true },
                { new: true },
            );

            if (!updated) {
                throw new BaseErrorException(
                    `Promotional price with ID ${id} not found`,
                    HttpStatus.NOT_FOUND,
                );
            }
        } catch (error) {
            throw new BaseErrorException(
                error.message,
                error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
