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
import { IAddressService } from '../../../domain/services/address.interface.service';
import SymbolsAddress from '../../../symbols-address';
import { CreateAddressDTO } from '../dtos/address.dto';

@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(
    @Inject(SymbolsAddress.IAddressService)
    private readonly addressService: IAddressService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Address created' })
  @ApiResponse({ status: 400, description: `Address shouldn't be created` })
  @ApiBody({ type: CreateAddressDTO, description: 'Data to create a Address' })
  async create(@Body() body: CreateAddressDTO) {
    return this.addressService.create(body);
  }

  @Get()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return all Addresss' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findAll() {
    return this.addressService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return Address by id' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findById(@Param('id') id: string) {
    return this.addressService.findById(id);
  }
}
