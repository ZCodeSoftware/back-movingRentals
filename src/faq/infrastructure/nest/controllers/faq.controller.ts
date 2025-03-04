import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IFaqService } from "../../../domain/services/faq.interface.service";
import SymbolsFaq from "../../../symbols-faq";
import { CreateFaqDTO } from "../dtos/faq.dto";

@ApiTags('faq')
@Controller('faq')
export class FaqController {
    constructor(
        @Inject(SymbolsFaq.IFaqService)
        private readonly faqService: IFaqService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Faq created' })
    @ApiResponse({ status: 400, description: `Faq shouldn't be created` })
    @ApiBody({ type: CreateFaqDTO, description: 'Data to create a Faq' })
    async create(@Body() body: CreateFaqDTO) {
        return this.faqService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Faqs' })
    @ApiResponse({ status: 404, description: 'Faq not found' })
    async findAll() {
        return this.faqService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Faq by id' })
    @ApiResponse({ status: 404, description: 'Faq not found' })
    async findById(@Param('id') id: string) {
        return this.faqService.findById(id);
    }
}
