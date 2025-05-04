import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TourFiltersDTO } from "../../../../tour/infrastructure/nest/dtos/tour.dto";
import { ITransferService } from "../../../domain/services/transfer.interface.service";
import SymbolsTransfer from "../../../symbols-transfer";
import { CreateTransferDTO, UpdateTransferDTO } from "../dtos/transfer.dto";

@ApiTags('transfer')
@Controller('transfer')
export class TransferController {
    constructor(
        @Inject(SymbolsTransfer.ITransferService)
        private readonly transferService: ITransferService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Transfer created' })
    @ApiResponse({ status: 400, description: `Transfer shouldn't be created` })
    @ApiBody({ type: CreateTransferDTO, description: 'Data to create a Transfer' })
    async create(@Body() body: CreateTransferDTO) {
        return this.transferService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Transfers' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    @ApiQuery({ type: TourFiltersDTO, description: 'Filters to find Transfers' })
    async findAll(@Query() filters: TourFiltersDTO) {
        return this.transferService.findAll(filters);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Transfer by id' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    async findById(@Param('id') id: string) {
        return this.transferService.findById(id);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Transfer updated' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    @ApiBody({ type: UpdateTransferDTO, description: 'Data to update a Transfer' })
    async update(@Param('id') id: string, @Body() body: UpdateTransferDTO) {
        return this.transferService.update(id, body);
    }
}
