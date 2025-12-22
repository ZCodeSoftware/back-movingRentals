import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../auth/infrastructure/nest/decorators/role.decorator";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuard } from "../../../../auth/infrastructure/nest/guards/role.guard";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { IVehicleOwnerService } from "../../../domain/services/vehicleowner.interface.service";
import SymbolsVehicleOwner from "../../../symbols-vehicleowner";
import { CreateVehicleOwnerDTO, UpdateVehicleOwnerDTO, VehicleOwnerQueryDTO } from "../dtos/vehicleowner.dto";

@ApiTags('vehicle-owner')
@Controller('vehicle-owner')
export class VehicleOwnerController {
    constructor(
        @Inject(SymbolsVehicleOwner.IVehicleOwnerService)
        private readonly vehicleownerService: IVehicleOwnerService
    ) { }

    @Post()
    @HttpCode(201)
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    @ApiResponse({ status: 201, description: 'VehicleOwner created' })
    @ApiResponse({ status: 400, description: `VehicleOwner shouldn't be created` })
    @ApiBody({ type: CreateVehicleOwnerDTO, description: 'Data to create a VehicleOwner' })
    async create(@Body() body: CreateVehicleOwnerDTO) {
        return this.vehicleownerService.create(body);
    }

    @Get()
    @HttpCode(200)
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    @ApiResponse({ status: 200, description: 'Return all VehicleOwners with pagination and filtering' })
    @ApiResponse({ status: 404, description: 'VehicleOwner not found' })
    async findAll(@Query() query: VehicleOwnerQueryDTO) {
        return this.vehicleownerService.findAll(query);
    }

    @Get('concierge')
    @HttpCode(200)
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR, TypeRoles.SELLER)
    @UseGuards(AuthGuards, RoleGuard)
    @ApiResponse({ status: 200, description: 'Return all concierge VehicleOwners' })
    @ApiResponse({ status: 404, description: 'Concierge VehicleOwners not found' })
    async findConcierges() {
        return this.vehicleownerService.findAllConcierges();
    }

    @Get('owners')
    @HttpCode(200)
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    @ApiResponse({ status: 200, description: 'Return all non-concierge VehicleOwners (regular owners)' })
    @ApiResponse({ status: 404, description: 'VehicleOwners not found' })
    async findOwners() {
        return this.vehicleownerService.findAllOwners();
    }

    @Get('owners/simple')
    @HttpCode(200)
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    @ApiResponse({ status: 200, description: 'Return all non-concierge VehicleOwners with minimal data (id and name only)' })
    @ApiResponse({ status: 404, description: 'VehicleOwners not found' })
    async findOwnersSimple() {
        return this.vehicleownerService.findAllOwnersSimple();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return VehicleOwner by id' })
    @ApiResponse({ status: 404, description: 'VehicleOwner not found' })
    async findById(@Param('id') id: string) {
        return this.vehicleownerService.findById(id);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'VehicleOwner updated' })
    @ApiResponse({ status: 400, description: `VehicleOwner shouldn't be updated` })
    @ApiBody({ type: UpdateVehicleOwnerDTO, description: 'Data to update a VehicleOwner' })
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    async update(@Param('id') id: string, @Body() body: UpdateVehicleOwnerDTO) {
        return this.vehicleownerService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(200)
    @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    @ApiResponse({ status: 200, description: 'VehicleOwner soft deleted successfully' })
    @ApiResponse({ status: 404, description: 'VehicleOwner not found or already deleted' })
    async softDelete(@Param('id') id: string) {
        return this.vehicleownerService.softDelete(id);
    }
}
