import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ICatPaymentMethodService } from '../../../domain/services/cat-payment-method.interface.service';
import SymbolsCatalogs from '../../../symbols-catalogs';
import { CreatePaymentMethodDTO } from '../dtos/cat-payment-method.dto';

@ApiTags('Cat Payment Method')
@Controller('cat-payment-method')
export class CatPaymentMethodController {
  constructor(
    @Inject(SymbolsCatalogs.ICatPaymentMethodService)
    private readonly catPaymentMethodService: ICatPaymentMethodService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return all payments methods' })
  @ApiResponse({ status: 404, description: 'Payments methods not found' })
  async findAll() {
    return this.catPaymentMethodService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return payment method by id' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async findById(@Param('id') id: string) {
    return this.catPaymentMethodService.findById(id);
  }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Payment method created' })
  @ApiResponse({
    status: 400,
    description: `Payment method shouldn't be created`,
  })
  @ApiBody({
    type: CreatePaymentMethodDTO,
    description: 'Data to create a payment method',
  })
  async create(@Body() body: CreatePaymentMethodDTO) {
    return this.catPaymentMethodService.create(body);
  }
}
