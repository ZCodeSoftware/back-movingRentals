import { Body, Controller, Get, HttpCode, Inject, Param, Put } from "@nestjs/common";
import { ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ICartService } from "../../../domain/services/cart.interface.service";
import SymbolsCart from "../../../symbols-cart";


@ApiTags('cart')
@Controller('cart')
export class CartController {
    constructor(
        @Inject(SymbolsCart.ICartService)
        private readonly cartService: ICartService
    ) { }

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
