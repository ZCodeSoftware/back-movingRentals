import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse } from "@nestjs/swagger";
import { ICatPriceConditionService } from "../../../domain/services/cat-price-condition.interface.service";
import SymbolsCatalogs from "../../../symbols-catalogs";
import { CreatePriceConditionDTO } from "../dtos/cat-price-condition.dto";

@Controller('cat-price-condition')
export class CatPriceConditionController {
    constructor(
        @Inject(SymbolsCatalogs.ICatPriceConditionService)
        private readonly catPriceConditionService: ICatPriceConditionService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Price condition created' })
    @ApiResponse({ status: 400, description: `Price condition shouldn't be created` })
    @ApiBody({ type: CreatePriceConditionDTO, description: 'Data to create a price condition' })
    async create(@Body() body: CreatePriceConditionDTO) {
        return this.catPriceConditionService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all price conditions' })
    @ApiResponse({ status: 404, description: 'Price condition not found' })
    async findAll() {
        return this.catPriceConditionService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return price condition by id' })
    @ApiResponse({ status: 404, description: 'Price condition not found' })
    async findById(@Param('id') id: string) {
        return this.catPriceConditionService.findById(id);
    }
}