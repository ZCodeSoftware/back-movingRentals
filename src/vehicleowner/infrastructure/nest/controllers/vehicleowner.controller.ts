import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IVehicleOwnerService } from "../../../domain/services/vehicleowner.interface.service";
import SymbolsVehicleOwner from "../../../symbols-vehicleowner";
import { CreateVehicleOwnerDTO } from "../dtos/vehicleowner.dto";

@ApiTags('vehicle-owner')
@Controller('vehicle-owner')
export class VehicleOwnerController {
    constructor(
        @Inject(SymbolsVehicleOwner.IVehicleOwnerService)
        private readonly vehicleownerService: IVehicleOwnerService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'VehicleOwner created' })
    @ApiResponse({ status: 400, description: `VehicleOwner shouldn't be created` })
    @ApiBody({ type: CreateVehicleOwnerDTO, description: 'Data to create a VehicleOwner' })
    async create(@Body() body: CreateVehicleOwnerDTO) {
        return this.vehicleownerService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all VehicleOwners' })
    @ApiResponse({ status: 404, description: 'VehicleOwner not found' })
    async findAll() {
        return this.vehicleownerService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return VehicleOwner by id' })
    @ApiResponse({ status: 404, description: 'VehicleOwner not found' })
    async findById(@Param('id') id: string) {
        return this.vehicleownerService.findById(id);
    }
}
