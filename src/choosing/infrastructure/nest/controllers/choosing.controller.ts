import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IChoosingService } from "../../../domain/services/choosing.interface.service";
import SymbolsChoosing from "../../../symbols-choosing";
import { CreateChoosingDTO } from "../dtos/choosing.dto";

@ApiTags('choosing')
@Controller('choosing')
export class ChoosingController {
    constructor(
        @Inject(SymbolsChoosing.IChoosingService)
        private readonly choosingService: IChoosingService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Choosing created' })
    @ApiResponse({ status: 400, description: `Choosing shouldn't be created` })
    @ApiBody({ type: CreateChoosingDTO, description: 'Data to create a Choosing' })
    async create(@Body() body: CreateChoosingDTO) {
        return this.choosingService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Choosings' })
    @ApiResponse({ status: 404, description: 'Choosing not found' })
    async findAll() {
        return this.choosingService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Choosing by id' })
    @ApiResponse({ status: 404, description: 'Choosing not found' })
    async findById(@Param('id') id: string) {
        return this.choosingService.findById(id);
    }
}
