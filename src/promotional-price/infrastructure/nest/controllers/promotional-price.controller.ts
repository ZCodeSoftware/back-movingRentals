import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IPromotionalPriceService } from '../../../domain/services/promotional-price.interface.service';
import SymbolsPromotionalPrice from '../../../symbols-promotional-price';
import { CreatePromotionalPriceDTO, UpdatePromotionalPriceDTO } from '../dtos/promotional-price.dto';

@ApiTags('promotional-price')
@Controller('promotional-price')
export class PromotionalPriceController {
    constructor(
        @Inject(SymbolsPromotionalPrice.IPromotionalPriceService)
        private readonly promotionalPriceService: IPromotionalPriceService,
    ) {}

    /**
     * Convierte una fecha a la zona horaria de México (America/Mexico_City)
     * Asegura que la fecha se interprete correctamente sin importar desde dónde se acceda
     */
    private toMexicoTimezone(dateInput: string | Date): Date {
        // Si es una cadena de fecha sin hora (YYYY-MM-DD), agregar la hora de México
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            // Agregar hora 00:00:00 en zona horaria de México
            return new Date(`${dateInput}T00:00:00.000-06:00`);
        }
        
        // Si ya tiene información de zona horaria o es un objeto Date, convertirlo
        const date = new Date(dateInput);
        
        // Obtener la fecha en formato ISO y ajustarla a México
        const mexicoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        
        return mexicoDate;
    }

    @Post()
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Promotional price created' })
    @ApiResponse({ status: 400, description: 'Invalid request' })
    @ApiBody({ type: CreatePromotionalPriceDTO })
    async create(@Body() body: CreatePromotionalPriceDTO) {
        return this.promotionalPriceService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all promotional prices' })
    @ApiQuery({ name: 'model', required: false, description: 'Filter by model ID' })
    @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date' })
    @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date' })
    async findAll(@Query() query: any) {
        return this.promotionalPriceService.findAll(query);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return promotional price by id' })
    @ApiResponse({ status: 404, description: 'Promotional price not found' })
    async findById(@Param('id') id: string) {
        return this.promotionalPriceService.findById(id);
    }

    @Get('model/:modelId/date/:date')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return promotional price for model and date' })
    @ApiResponse({ status: 404, description: 'Promotional price not found' })
    async findByModelAndDate(
        @Param('modelId') modelId: string,
        @Param('date') date: string,
    ) {
        // Convertir la fecha a zona horaria de México antes de buscar
        const mexicoDate = this.toMexicoTimezone(date);
        return this.promotionalPriceService.findByModelAndDate(modelId, mexicoDate);
    }

    @Put(':id')
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Promotional price updated' })
    @ApiResponse({ status: 404, description: 'Promotional price not found' })
    @ApiBody({ type: UpdatePromotionalPriceDTO })
    async update(@Param('id') id: string, @Body() body: UpdatePromotionalPriceDTO) {
        return this.promotionalPriceService.update(id, body);
    }

    @Delete(':id')
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    @HttpCode(204)
    @ApiResponse({ status: 204, description: 'Promotional price soft-deleted' })
    @ApiResponse({ status: 404, description: 'Promotional price not found' })
    async delete(@Param('id') id: string): Promise<void> {
        await this.promotionalPriceService.delete(id);
    }
}
