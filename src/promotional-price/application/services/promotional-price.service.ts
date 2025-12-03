import { Inject, Injectable } from '@nestjs/common';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import SymbolsCatalogs from '../../../catalogs/symbols-catalogs';
import { ICatModelRepository } from '../../../vehicle/domain/repositories/cat-model.interface.repository';
import { PromotionalPriceModel } from '../../domain/models/promotional-price.model';
import { IPromotionalPriceRepository } from '../../domain/repositories/promotional-price.interface.repository';
import { IPromotionalPriceService } from '../../domain/services/promotional-price.interface.service';
import { ICreatePromotionalPrice, IUpdatePromotionalPrice } from '../../domain/types/promotional-price.type';
import SymbolsPromotionalPrice from '../../symbols-promotional-price';

@Injectable()
export class PromotionalPriceService implements IPromotionalPriceService {
    constructor(
        @Inject(SymbolsPromotionalPrice.IPromotionalPriceRepository)
        private readonly promotionalPriceRepository: IPromotionalPriceRepository,
        @Inject(SymbolsCatalogs.ICatModelRepository)
        private readonly catModelRepository: ICatModelRepository,
    ) {}

    /**
     * Convierte una fecha a objeto Date manteniendo la zona horaria de México
     * Las fechas vienen del frontend en zona horaria de México (America/Cancun)
     * con formato ISO que incluye el offset (ej: 2026-01-15T08:01:00-05:00)
     */
    private toDate(dateInput: string | Date): Date {
        if (dateInput instanceof Date) {
            return dateInput;
        }
        
        const date = new Date(dateInput);
        
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }
        
        return date;
    }

    async create(data: ICreatePromotionalPrice): Promise<PromotionalPriceModel> {
        const { model, ...rest } = data;

        const startDate = this.toDate(data.startDate);
        const endDate = this.toDate(data.endDate);

        if (startDate >= endDate) {
            throw new BaseErrorException('Start date must be before end date', 400);
        }

        const existingPromotions = await this.promotionalPriceRepository.findAll({
            model,
            isActive: true,
        });

        const hasOverlap = existingPromotions.some((promo) => {
            const promoJson = promo.toJSON();
            const promoStart = this.toDate(promoJson.startDate);
            const promoEnd = this.toDate(promoJson.endDate);

            return (startDate < promoEnd && endDate > promoStart);
        });

        if (hasOverlap) {
            throw new BaseErrorException(
                'Date range overlaps with an existing promotional price for this model',
                400,
            );
        }

        const promotionalPriceModel = PromotionalPriceModel.create({
            ...rest,
            startDate,
            endDate,
            isActive: true,
        });

        const catModel = await this.catModelRepository.findById(model);
        if (!catModel) {
            throw new BaseErrorException('Model not found', 404);
        }

        promotionalPriceModel.addModel(catModel);

        return this.promotionalPriceRepository.create(promotionalPriceModel);
    }

    async findById(id: string): Promise<PromotionalPriceModel> {
        return this.promotionalPriceRepository.findById(id);
    }

    async findAll(filters: any): Promise<PromotionalPriceModel[]> {
        return this.promotionalPriceRepository.findAll(filters);
    }

    async findByModelAndDate(modelId: string, date: Date): Promise<PromotionalPriceModel | null> {
        return this.promotionalPriceRepository.findByModelAndDate(modelId, date);
    }

    async update(id: string, data: IUpdatePromotionalPrice): Promise<PromotionalPriceModel> {
        const { model, ...rest } = data;

        const currentPromo = await this.promotionalPriceRepository.findById(id);
        const currentJson = currentPromo.toJSON();

        if (data.startDate && data.endDate) {
            const startDate = this.toDate(data.startDate);
            const endDate = this.toDate(data.endDate);

            if (startDate >= endDate) {
                throw new BaseErrorException('Start date must be before end date', 400);
            }

            const modelId = model || (
                currentJson.model && 
                typeof currentJson.model === 'object' && 
                '_id' in currentJson.model 
                    ? String(currentJson.model._id) 
                    : null
            );
            
            if (modelId) {
                const existingPromotions = await this.promotionalPriceRepository.findAll({
                    model: modelId,
                    isActive: true,
                });

                const hasOverlap = existingPromotions.some((promo) => {
                    const promoJson = promo.toJSON();
                    if (String(promoJson._id) === id) return false;

                    const promoStart = this.toDate(promoJson.startDate);
                    const promoEnd = this.toDate(promoJson.endDate);

                    return (startDate < promoEnd && endDate > promoStart);
                });

                if (hasOverlap) {
                    throw new BaseErrorException(
                        'Date range overlaps with an existing promotional price for this model',
                        400,
                    );
                }
            }
        }

        const updateData: any = { ...rest };
        if (data.startDate) updateData.startDate = this.toDate(data.startDate);
        if (data.endDate) updateData.endDate = this.toDate(data.endDate);

        const promotionalPriceModel = PromotionalPriceModel.create(updateData);

        if (model) {
            const catModel = await this.catModelRepository.findById(model);
            if (catModel) {
                promotionalPriceModel.addModel(catModel);
            }
        }

        return this.promotionalPriceRepository.update(id, promotionalPriceModel);
    }

    async delete(id: string): Promise<void> {
        return this.promotionalPriceRepository.softDelete(id);
    }
}
