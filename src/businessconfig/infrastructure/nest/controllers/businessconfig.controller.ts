import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBody, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IBusinessConfigService } from "../../../domain/services/businessconfig.interface.service";
import SymbolsBusinessConfig from "../../../symbols-businessconfig";
import { CreateBusinessConfigDTO, UpdateBusinessConfigDTO } from "../dtos/businessconfig.dto";

@ApiTags('businessconfig')
@Controller('businessconfig')
export class BusinessConfigController {
    constructor(
        @Inject(SymbolsBusinessConfig.IBusinessConfigService)
        private readonly businessconfigService: IBusinessConfigService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'BusinessConfig created' })
    @ApiResponse({ status: 400, description: `BusinessConfig shouldn't be created` })
    @ApiResponse({ status: 409, description: 'A business configuration already exists for this branch' })
    @ApiBody({ type: CreateBusinessConfigDTO, description: 'Data to create a BusinessConfig' })
    async create(@Body() body: CreateBusinessConfigDTO) {
        return this.businessconfigService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all BusinessConfigs' })
    @ApiResponse({ status: 404, description: 'BusinessConfig not found' })
    @UseGuards()
    async findAll() {
        return this.businessconfigService.findAll();
    }

    @Get('branch/:branchId')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return BusinessConfig by branch id' })
    @ApiResponse({ status: 404, description: 'BusinessConfig not found for this branch' })
    @ApiParam({ name: 'branchId', description: 'Branch ID', type: String })
    async findByBranch(@Param('branchId') branchId: string) {
        return this.businessconfigService.findByBranch(branchId);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return BusinessConfig by id' })
    @ApiResponse({ status: 404, description: 'BusinessConfig not found' })
    async findById(@Param('id') id: string) {
        return this.businessconfigService.findById(id);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'BusinessConfig updated' })
    @ApiResponse({ status: 404, description: 'BusinessConfig not found' })
    @ApiResponse({ status: 409, description: 'A business configuration already exists for this branch' })
    @ApiBody({ type: UpdateBusinessConfigDTO, description: 'Data to update a BusinessConfig' })
    async update(@Param('id') id: string, @Body() body: UpdateBusinessConfigDTO) {
        return this.businessconfigService.update(id, body);
    }
}
