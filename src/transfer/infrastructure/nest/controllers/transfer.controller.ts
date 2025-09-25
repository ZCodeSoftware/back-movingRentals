import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, Delete } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
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
    @ApiOperation({ summary: 'Create transfer', description: 'Creates a new transfer with the provided data.' })
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Transfer created' })
    @ApiResponse({ status: 400, description: `Validation error - Invalid payload` })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiBody({ type: CreateTransferDTO, description: 'Data to create a Transfer' })
    async create(@Body() body: CreateTransferDTO) {
        return this.transferService.create(body);
    }

    @Get()
    @ApiOperation({ summary: 'List transfers', description: 'Returns a list of transfers filtered by the provided query parameters.' })
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Transfers listed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid query parameters' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiQuery({ type: TourFiltersDTO, description: 'Filters to find Transfers' })
    async findAll(@Query() filters: TourFiltersDTO) {
        return this.transferService.findAll(filters);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get transfer by id', description: 'Retrieves a transfer using its unique identifier.' })
    @ApiParam({ name: 'id', type: String, description: 'Transfer ID' })
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Transfer retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    @ApiResponse({ status: 400, description: 'Invalid ID format' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async findById(@Param('id') id: string) {
        return this.transferService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update transfer', description: 'Updates the specified transfer with the provided data.' })
    @ApiParam({ name: 'id', type: String, description: 'Transfer ID' })
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Transfer updated successfully' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    @ApiResponse({ status: 400, description: 'Validation error - Invalid payload or ID' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiBody({ type: UpdateTransferDTO, description: 'Data to update a Transfer' })
    async update(@Param('id') id: string, @Body() body: UpdateTransferDTO) {
        return this.transferService.update(id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Soft-delete transfer', description: 'Marks the transfer as deleted (isDeleted=true) without removing it from the database.' })
    @ApiParam({ name: 'id', type: String, description: 'Transfer ID' })
    @HttpCode(204)
    @ApiResponse({ status: 204, description: 'Transfer soft-deleted' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    @ApiResponse({ status: 400, description: 'Invalid ID format' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async delete(@Param('id') id: string): Promise<void> {
        await this.transferService.delete(id);
    }
}
