import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../auth/infrastructure/nest/decorators/role.decorator";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuard } from "../../../../auth/infrastructure/nest/guards/role.guard";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { IVehicleService } from "../../../domain/services/vehicle.interface.service";
import SymbolsVehicle from "../../../symbols-vehicle";
import { CreateVehicleDTO, UpdatePriceByModelDTO, UpdateVehicleDTO } from "../dtos/vehicle.dto";

@ApiTags('vehicle')
@Controller('vehicle')
export class VehicleController {
    constructor(
        @Inject(SymbolsVehicle.IVehicleService)
        private readonly vehicleService: IVehicleService
    ) { }

    @Post()
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Vehicle created' })
    @ApiResponse({ status: 400, description: `Vehicle shouldn't be created` })
    @ApiBody({ type: CreateVehicleDTO, description: 'Data to create a Vehicle' })
    async create(@Body() body: CreateVehicleDTO) {
        return this.vehicleService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Vehicles' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    async findAll(@Query() query: any) {
        if (query.lang) {
            delete query.lang;
        }
        if (query.start || query.end) {
            return this.vehicleService.findByDate(query);
        }
        return this.vehicleService.findAll(query);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Vehicle by id' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    async findById(@Param('id') id: string) {
        return this.vehicleService.findById(id);
    }

    @Put('model/:model')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Vehicle updated by model id' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async updateByModel(@Param('model') id: string, @Body() prices: UpdatePriceByModelDTO) {
        return this.vehicleService.updateByModel(id, prices);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Vehicle updated by id' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    @UseGuards(AuthGuards)
    async update(@Param('id') id: string, @Body() body: UpdateVehicleDTO) {
        return this.vehicleService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiResponse({ status: 204, description: 'Vehicle soft-deleted' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async delete(@Param('id') id: string): Promise<void> {
        await this.vehicleService.delete(id);
    }

    @Post('bulk-update-prices')
    @HttpCode(200)
    /*     @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
        @UseGuards(AuthGuards, RoleGuard) */
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Excel file with vehicle prices (columns: Nombre, Semanal, Mensual)',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Bulk update completed',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                processed: { type: 'number' },
                updated: { type: 'number' },
                notFound: { type: 'array', items: { type: 'string' } },
                errors: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid file or format' })
    async bulkUpdatePrices(@UploadedFile() file: any) {
        return this.vehicleService.bulkUpdatePricesFromExcel(file);
    }
}
