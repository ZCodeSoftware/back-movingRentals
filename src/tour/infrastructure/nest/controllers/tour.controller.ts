import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ITourService } from "../../../domain/services/tour.interface.service";
import SymbolsTour from "../../../symbols-tour";
import { CreateTourDTO } from "../dtos/tour.dto";

@ApiTags('tour')
@Controller('tour')
export class TourController {
    constructor(
        @Inject(SymbolsTour.ITourService)
        private readonly tourService: ITourService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Tour created' })
    @ApiResponse({ status: 400, description: `Tour shouldn't be created` })
    @ApiBody({ type: CreateTourDTO, description: 'Data to create a Tour' })
    async create(@Body() body: CreateTourDTO) {
        return this.tourService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Tours' })
    @ApiResponse({ status: 404, description: 'Tour not found' })
    async findAll() {
        return this.tourService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Tour by id' })
    @ApiResponse({ status: 404, description: 'Tour not found' })
    async findById(@Param('id') id: string) {
        return this.tourService.findById(id);
    }
}
