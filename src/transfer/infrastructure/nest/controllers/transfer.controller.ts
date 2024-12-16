import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ITransferService } from "../../../domain/services/transfer.interface.service";
import SymbolsTransfer from "../../../symbols-transfer";
import { CreateTransferDTO } from "../dtos/transfer.dto";

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
    async findAll() {
        return this.transferService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Transfer by id' })
    @ApiResponse({ status: 404, description: 'Transfer not found' })
    async findById(@Param('id') id: string) {
        return this.transferService.findById(id);
    }
}
