import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../auth/infrastructure/nest/decorators/role.decorator";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuard } from "../../../../auth/infrastructure/nest/guards/role.guard";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { ICatCategoryService } from "../../../domain/services/cat-category.interface.service";
import SymbolsCatalogs from "../../../symbols-catalogs";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../dtos/cat-category.dto";

@ApiTags('Cat Category')
@Controller('cat-category')
export class CatCategoryController {
    constructor(
        @Inject(SymbolsCatalogs.ICatCategoryService)
        private readonly catCategoryService: ICatCategoryService,
    ) { }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all categories' })
    @ApiResponse({ status: 200, description: 'Return category by name' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async findAll(@Query("category") category: string) {
        if (category) {
            return this.catCategoryService.findByName(category);
        }
        return this.catCategoryService.findAll();
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return all categories' })
    @ApiResponse({ status: 200, description: 'Return category by name' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async findById(@Param("id") id: string) {
        return this.catCategoryService.findById(id);
    }

    @Post()
    @HttpCode(201)
    @ApiResponse({ status: 201, description: 'Category created' })
    @ApiResponse({ status: 400, description: `Category shouldn't be created` })
    @ApiBody({ type: CreateCategoryDTO, description: 'Data to create a category' })
    @Roles(TypeRoles.ADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async create(@Body() body: CreateCategoryDTO) {
        return this.catCategoryService.create(body);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Category updated' })
    @ApiResponse({ status: 400, description: `Category shouldn't be updated` })
    @ApiBody({ type: UpdateCategoryDTO, description: 'Data to update a category' })
    @Roles(TypeRoles.ADMIN)
    @UseGuards(AuthGuards, RoleGuard)
    async update(@Param("id") id: string, @Body() body: UpdateCategoryDTO) {
        return this.catCategoryService.update(id, body);
    }
}