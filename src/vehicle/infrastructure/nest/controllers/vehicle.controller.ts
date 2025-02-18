import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuards } from "../../../../auth/infrastructure/nest/guards/role.guard";
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
        if (query.model) {
            return this.vehicleService.findByDate(query);
        }
        return this.vehicleService.findAll();
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
    @UseGuards(AuthGuards, RoleGuards)
    async updateByModel(@Param('model') id: string, @Body() prices: UpdatePriceByModelDTO) {
        return this.vehicleService.updateByModel(id, prices);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Vehicle updated by id' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    @UseGuards(AuthGuards, RoleGuards)
    async update(@Param('id') id: string, @Body() body: UpdateVehicleDTO) {
        return this.vehicleService.update(id, body);
    }
}
