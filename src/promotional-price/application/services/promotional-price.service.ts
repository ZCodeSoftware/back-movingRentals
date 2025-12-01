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
     * Convierte una fecha a objeto Date sin modificar la zona horaria
     * Las fechas vienen del frontend con la zona horaria correcta
     */
    private toDate(dateInput: string | Date): Date {
        // Simplemente convertir a Date sin modificar nada
        return new Date(dateInput);
    }

    async create(data: ICreatePromotionalPrice): Promise<PromotionalPriceModel> {
        const { model, ...rest } = data;

        // Validar que la fecha de inicio sea menor que la fecha de fin
        const startDate = this.toDate(data.startDate);
        const endDate = this.toDate(data.endDate);

        if (startDate >= endDate) {
            throw new BaseErrorException('Start date must be before end date', 400);
        }

        // Validar que no haya solapamiento con otros intervalos del mismo modelo
        const existingPromotions = await this.promotionalPriceRepository.findAll({
            model,
            isActive: true,
        });

        const hasOverlap = existingPromotions.some((promo) => {
            const promoJson = promo.toJSON();
            const promoStart = this.toDate(promoJson.startDate);
            const promoEnd = this.toDate(promoJson.endDate);

            console.log('=== Checking overlap ===');
            console.log('New promotion:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            console.log('Existing promotion:', {
                id: promoJson._id,
                description: promoJson.description,
                startDate: promoStart.toISOString(),
                endDate: promoEnd.toISOString(),
            });

            // Verificar si hay solapamiento
            // Dos rangos se solapan si uno comienza antes de que el otro termine
            // y termina después de que el otro comience
            // Permitimos que una promoción termine exactamente cuando otra comienza
            const overlaps = (startDate < promoEnd && endDate > promoStart);
            console.log('Overlaps?', overlaps);
            console.log('========================');

            return overlaps;
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

        // Obtener la promoción actual
        const currentPromo = await this.promotionalPriceRepository.findById(id);
        const currentJson = currentPromo.toJSON();

        // Validar fechas si se proporcionan ambas
        if (data.startDate && data.endDate) {
            const startDate = this.toDate(data.startDate);
            const endDate = this.toDate(data.endDate);

            if (startDate >= endDate) {
                throw new BaseErrorException('Start date must be before end date', 400);
            }

            // Validar que no haya solapamiento con otros intervalos del mismo modelo (excluyendo el actual)
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
                    // Excluir la promoción actual de la validación
                    if (String(promoJson._id) === id) return false;

                    const promoStart = this.toDate(promoJson.startDate);
                    const promoEnd = this.toDate(promoJson.endDate);

                    // Verificar si hay solapamiento
                    // Dos rangos se solapan si uno comienza antes de que el otro termine
                    // y termina después de que el otro comience
                    return (
                        (startDate < promoEnd && endDate > promoStart)
                    );
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
