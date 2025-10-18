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
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
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
  ) {}

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: `Booking shouldn't be created` })
  @ApiBody({ type: CreateBookingDTO, description: 'Data to create a Booking' })
  @UseGuards(AuthGuards)
  async create(@Body() body: CreateBookingDTO, @Req() req: IUserRequest) {
    const { _id } = req.user;
    return this.bookingService.create(body, _id);
  }

  @Get()
  @HttpCode(200)
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 200, description: 'Return all Bookings' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'Filter by status ID',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    type: 'string',
    description: 'Filter by payment method ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: 'string',
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Filter by start date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'Filter by end date',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'isReserve',
    required: false,
    type: 'boolean',
    description: 'Filter by reservation status',
  })
  async findAll(@Query() filters: any) {
    const res = await this.bookingService.findAll(filters);
    return res;
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

  @Post('/user/manual/:email')
  @HttpCode(201)
  @ApiResponse({
    status: 201,
    description: 'Manual Booking is added in User from cart data',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cart is empty or invalid' })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERADMIN,
    TypeRoles.SUPERVISOR,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async addManualBookingInUser(
    @Param('email') email: string,
    @Body() body: Partial<CreateBookingDTO>,
    @Query('lang') lang: string = 'es',
  ) {
    // Set source as Dashboard for manual bookings
    const bookingData = {
      ...body,
      source: 'Dashboard'
    };
    
    return this.bookingService.addManualBookingInUserFromCart(
      email,
      bookingData,
      lang,
    );
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
  @ApiQuery({
    name: 'lang',
    required: false,
    type: 'string',
    description: 'Language for response',
  })
  @ApiQuery({
    name: 'isManual',
    required: false,
    type: 'boolean',
    description: 'Indicates if the booking is manual',
  })
  @ApiQuery({
    name: 'isValidated',
    required: false,
    type: 'boolean',
    description: 'Indicates if the booking is validated',
  })
  @UseGuards(AuthGuards)
  async validateBooking(
    @Param('id') id: string,
    @Query('paid') paid: boolean,
    @Query('lang') lang: string,
    @Req() req: IUserRequest,
    @Query('isManual') isManual = false,
    @Query('isValidated') isValidated = false,
  ) {
    const { email } = req.user;
    const language = lang ?? 'es';
    return await this.bookingService.validateBooking(
      id,
      paid,
      email,
      language,
      isManual,
      isValidated,
    );
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

  @Put('cancel/:id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Booking is already cancelled' })
  @ApiQuery({ name: 'lang', required: false, type: 'string', description: 'Language for email notifications' })
  @UseGuards(AuthGuards)
  async cancelBooking(
    @Param('id') id: string,
    @Query('lang') lang: string,
    @Req() req: IUserRequest,
  ) {
    const { email } = req.user;
    const language = lang ?? 'es';
    return await this.bookingService.cancelBooking(id, email, language);
  }

  @Put('confirm/:id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Reservation confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Booking is not a reservation' })
  @ApiQuery({ name: 'lang', required: false, type: 'string', description: 'Language for email notifications' })
  @UseGuards(AuthGuards)
  async confirmReservation(
    @Param('id') id: string,
    @Query('lang') lang: string,
    @Req() req: IUserRequest,
  ) {
    const { email } = req.user;
    const language = lang ?? 'es';
    return await this.bookingService.confirmReservation(id, email, language);
  }
}
