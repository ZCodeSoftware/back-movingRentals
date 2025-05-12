import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import SymbolsUser from '../../../../user/symbols-user';
import { IBookingService } from '../../../domain/services/booking.interface.service';
import { IUserService } from '../../../domain/services/user.interface.service';
import SymbolsBooking from '../../../symbols-booking';
import { CreateBookingDTO } from '../dtos/booking.dto';
import { UserBookingDTO } from '../dtos/user.dto';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(
    @Inject(SymbolsBooking.IBookingService)
    private readonly bookingService: IBookingService,
    @Inject(SymbolsUser.IUserService)
    private readonly userService: IUserService,
  ) { }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: `Booking shouldn't be created` })
  @ApiBody({ type: CreateBookingDTO, description: 'Data to create a Booking' })
  @UseGuards(AuthGuards)
  async create(@Body() body: CreateBookingDTO, @Req() req: IUserRequest) {
    const { _id, email } = req.user;
    return this.bookingService.create(body, _id, email);
  }

  @Get()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return all Bookings' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findAll() {
    return this.bookingService.findAll();
  }
  @Get('/user')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return Booking by User id' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @UseGuards(AuthGuards)
  async findByUserId(@Req() req: IUserRequest) {
    const { _id } = req.user;
    return this.bookingService.findByUserId(_id);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return Booking by id' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findById(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Post('/user')
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Booking is added in User' })
  @ApiResponse({
    status: 400,
    description: `Booking shouldn't be added in User`,
  })
  @ApiBody({ type: UserBookingDTO, description: 'Data to add Booking in User' })
  @UseGuards(AuthGuards)
  async addBookingInUser(
    @Req() req: IUserRequest,
    @Body() body: UserBookingDTO,
  ) {
    const { _id } = req.user;

    return this.userService.addBookingInUser(_id, body);
  }

  @Put('validate/:id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Booking validated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiQuery({ name: 'paid', required: true, type: 'boolean' })
  async validateBooking(
    @Param('id') id: string,
    @Query('paid') paid: boolean,
  ) {
    return await this.bookingService.validateBooking(id, paid);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Booking updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiBody({ type: CreateBookingDTO, description: 'Data to update a Booking' })
  @UseGuards(AuthGuards)
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateBookingDTO>,
  ) {
    return this.bookingService.update(id, body);
  }
}
