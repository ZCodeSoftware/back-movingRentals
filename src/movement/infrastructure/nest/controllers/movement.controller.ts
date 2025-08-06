import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../auth/infrastructure/nest/decorators/role.decorator";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuard } from "../../../../auth/infrastructure/nest/guards/role.guard";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { IUserRequest } from "../../../../core/infrastructure/nest/dtos/custom-request/user.request";
import { IMovementService } from "../../../domain/services/movement.interface.service";
import SymbolsMovement from "../../../symbols-movement";
import { CreateMovementDTO } from "../dtos/movement.dto";

@ApiTags('movement')
@Controller('movement')
export class MovementController {
    constructor(
        @Inject(SymbolsMovement.IMovementService)
        private readonly movementService: IMovementService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Movement created' })
    @ApiResponse({ status: 400, description: `Movement shouldn't be created` })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiBody({ type: CreateMovementDTO, description: 'Data to create a Movement' })
    @Roles(TypeRoles.ADMIN, TypeRoles.SELLER, TypeRoles.SUPERVISOR, TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async create(@Body() body: CreateMovementDTO, @Req() req: IUserRequest) {
        const { _id } = req.user;
        return this.movementService.create(body, _id);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Movements with pagination' })
    @ApiResponse({ status: 404, description: 'Movement not found' })
    @ApiQuery({ name: 'page', required: false, type: 'number', description: 'Page number for pagination (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Number of items per page (default: 10)' })
    @Roles(TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async findAll(@Query() filters: any) {
        return this.movementService.findAll(filters);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Movement by id' })
    @ApiResponse({ status: 404, description: 'Movement not found' })
    @Roles(TypeRoles.SUPERADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async findById(@Param('id') id: string) {
        return this.movementService.findById(id);
    }
}
