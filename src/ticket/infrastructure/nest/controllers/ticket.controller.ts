import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ITicketService } from "../../../domain/services/ticket.interface.service";
import SymbolsTicket from "../../../symbols-ticket";
import { CreateTicketDTO, TicketFiltersDTO, UpdateTicketDTO } from "../dtos/ticket.dto";

@ApiTags('ticket')
@Controller('ticket')
export class TicketController {
    constructor(
        @Inject(SymbolsTicket.ITicketService)
        private readonly ticketService: ITicketService
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Ticket created' })
    @ApiResponse({ status: 400, description: `Ticket shouldn't be created` })
    @ApiBody({ type: CreateTicketDTO, description: 'Data to create a Ticket' })
    async create(@Body() body: CreateTicketDTO) {
        return this.ticketService.create(body);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all Tickets' })
    @ApiResponse({ status: 404, description: 'Ticket not found' })
    @ApiQuery({ type: TicketFiltersDTO, description: 'Filters to find Tickets' })

    async findAll(@Query() filters: TicketFiltersDTO) {
        return this.ticketService.findAll(filters);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Ticket by id' })
    @ApiResponse({ status: 404, description: 'Ticket not found' })
    async findById(@Param('id') id: string) {
        return this.ticketService.findById(id);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Update Ticket by id' })
    @ApiResponse({ status: 404, description: 'Ticket not found' })
    async update(@Param('id') id: string, @Body() body: UpdateTicketDTO) {
        return this.ticketService.update(id, body);
    }
}
