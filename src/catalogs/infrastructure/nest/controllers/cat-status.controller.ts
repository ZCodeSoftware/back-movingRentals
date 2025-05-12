import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CatStatusModel } from "../../../domain/models/cat-status.model";
import { ICatStatusService } from "../../../domain/services/cat-status.interface.service";
import SymbolsCatalogs from "../../../symbols-catalogs";
import { CreateStatusDTO } from "../dtos/cat-status.dto";

@ApiTags("Cat-Status")
@Controller("cat-status")
export class CatStatusController {
    constructor(
        @Inject(SymbolsCatalogs.ICatStatusService) private readonly catStatusService: ICatStatusService,
    ) { }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: "CatStatus created" })
    @ApiResponse({ status: 400, description: "Bad Request" })
    @ApiResponse({ status: 500, description: "Internal Server Error" })
    @ApiBody({ type: CreateStatusDTO, description: "Create CatStatus" })
    async create(@Body() catStatus: CreateStatusDTO): Promise<CatStatusModel> {
        return await this.catStatusService.create(catStatus);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: "CatStatus found" })
    @ApiResponse({ status: 404, description: "CatStatus not found" })
    @ApiResponse({ status: 500, description: "Internal Server Error" })
    async findAll(): Promise<CatStatusModel[]> {
        return await this.catStatusService.findAll();
    }

    @Get(":id")
    @HttpCode(200)
    @ApiResponse({ status: 200, description: "CatStatus found" })
    @ApiResponse({ status: 404, description: "CatStatus not found" })
    @ApiResponse({ status: 500, description: "Internal Server Error" })
    async findById(@Param("id") id: string): Promise<CatStatusModel> {
        return await this.catStatusService.findById(id);
    }
}

