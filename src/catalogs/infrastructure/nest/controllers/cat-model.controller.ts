import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuards } from "../../../../auth/infrastructure/nest/guards/role.guard";
import { ICatModelService } from "../../../domain/services/cat-model.interface.service";
import SymbolsCatalogs from "../../../symbols-catalogs";
import { CreateModelDTO, UpdateModelDTO } from "../dtos/cat-model.dto";

@Controller('cat-model')
@ApiTags('Cat Model')
export class CatModelController {
    constructor(
        @Inject(SymbolsCatalogs.ICatModelService)
        private readonly catModelService: ICatModelService,
    ) { }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all models' })
    async findAll() {
        return this.catModelService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return model by id' })
    @ApiResponse({ status: 404, description: 'Model not found' })
    async findById(@Param('id') id: string) {
        return this.catModelService.findById(id);
    }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Model created' })
    @ApiResponse({ status: 400, description: `Model shouldn't be created` })
    @ApiBody({ type: CreateModelDTO, description: 'Data to create a model' })
    async create(@Body() body: CreateModelDTO) {
        return this.catModelService.create(body);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Model updated' })
    @ApiResponse({ status: 400, description: `Model shouldn't be updated` })
    @ApiBody({ type: UpdateModelDTO, description: 'Data to update a model' })
    @UseGuards(AuthGuards, RoleGuards)
    async update(@Param('id') id: string, @Body() body: UpdateModelDTO) {
        return this.catModelService.update(id, body);
    }
}
