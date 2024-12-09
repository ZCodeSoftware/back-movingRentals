import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IVehicleService } from "../../../domain/services/vehicle.interface.service";
import SymbolsVehicle from "../../../symbols-vehicle";
import { CreateVehicleDTO } from "../dtos/vehicle.dto";

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
    async findAll() {
        return this.vehicleService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Vehicle by id' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    async findById(@Param('id') id: string) {
        return this.vehicleService.findById(id);
    }
}
