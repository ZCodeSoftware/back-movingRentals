import { Body, Controller, Get, HttpCode, Inject, Param, Put, UseGuards } from "@nestjs/common";
import { ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../auth/infrastructure/nest/decorators/role.decorator";
import { AuthGuards } from "../../../../auth/infrastructure/nest/guards/auth.guard";
import { RoleGuard } from "../../../../auth/infrastructure/nest/guards/role.guard";
import { TypeRoles } from "../../../../core/domain/enums/type-roles.enum";
import { ICartService } from "../../../domain/services/cart.interface.service";
import SymbolsCart from "../../../symbols-cart";


@ApiTags('cart')
@Controller('cart')
export class CartController {
    constructor(
        @Inject(SymbolsCart.ICartService)
        private readonly cartService: ICartService
    ) { }

    @Put('user/:email')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Cart updated by user email' })
    @ApiResponse({ status: 404, description: 'User or Cart not found' })
    @ApiParam({ name: 'email', type: 'string', description: 'User email' })
    @Roles(TypeRoles.ADMIN, TypeRoles.SELLER, TypeRoles.SUPERADMIN, TypeRoles.SUPERVISOR)
    @UseGuards(AuthGuards, RoleGuard)
    async updateByUserEmail(
        @Param('email') email: string,
        @Body() data: any
    ) {
        return this.cartService.updateByEmail(email, data);
    }

    @Put(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Cart updated' })
    @ApiResponse({ status: 404, description: 'Cart not found' })
    @ApiParam({ name: 'id', type: 'string' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.cartService.update(id, data);
    }

    @Get(':id')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Return Cart by id' })
    @ApiResponse({ status: 404, description: 'Cart not found' })
    async findById(@Param('id') id: string) {
        return this.cartService.findById(id);
    }
}
