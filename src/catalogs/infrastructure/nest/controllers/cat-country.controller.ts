import { Controller, Get, HttpCode, Inject, Param } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { ICatCountryService } from "../../../domain/services/cat-country.interface.service";
import SymbolsCatalogs from "../../../symbols-catalogs";

@ApiTags('Cat Country')
@Controller('cat-country')
export class CatCountryController {
    constructor(
        @Inject(SymbolsCatalogs.ICatCountryService)
        private readonly catCountryService: ICatCountryService,
    ) { }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all countries' })
    async findAll() {
        return this.catCountryService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return country by id' })
    @ApiResponse({ status: 404, description: 'Country not found' })
    async findById(@Param("id") id: string) {
        return this.catCountryService.findById(id);
    }
}