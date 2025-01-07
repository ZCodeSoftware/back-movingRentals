import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ICatModelService } from "../../../domain/services/cat-model.interface.service";
import SymbolsCatalogs from "../../../symbols-catalogs";
import { CreateModelDTO } from "../dtos/cat-model.dto";

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
}
