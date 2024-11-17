import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { IPriceService } from "../../../domain/services/price.interface.service";
import SymbolsPrice from "../../../symbols-price";
import { CreatePriceDTO } from "../dtos/price.dto";

@ApiTags('Price')
@Controller('price')
export class PriceController {
    constructor(
        @Inject(SymbolsPrice.IPriceService)
        private readonly priceService: IPriceService
    ) { }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all prices' })
    async findAll() {
        return this.priceService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return price by id' })
    async findById(@Param('id') id: string) {
        return this.priceService.findById(id);
    }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Price created' })
    @ApiResponse({ status: 400, description: `Price shouldn't be created` })
    async create(@Body() body: CreatePriceDTO) {
        return this.priceService.create(body);
    }
}