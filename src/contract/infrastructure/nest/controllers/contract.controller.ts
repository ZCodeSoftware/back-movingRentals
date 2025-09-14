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
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import { IContractService } from '../../../domain/services/contract.interface.service';
import SymbolsContract from '../../../symbols-contract';
import {
  CreateContractDTO,
  ReportEventDTO,
  UpdateContractDTO,
} from '../dtos/contract.dto';

@ApiTags('Contract')
@Controller('contract')
export class ContractController {
  constructor(
    @Inject(SymbolsContract.IContractService)
    private readonly contractService: IContractService,
  ) { }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({ status: 400, description: `Contract shouldn't be created` })
  @ApiBody({
    type: CreateContractDTO,
    description: 'Data to create a Contract',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
    TypeRoles.USER,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async create(@Body() body: CreateContractDTO, @Req() req: IUserRequest) {
    const { _id } = req.user;

    const contractData = {
      ...body,
      extension: body.extension
        ? {
          ...body.extension,
          newEndDateTime: body.extension.newEndDateTime
            ? body.extension.newEndDateTime
            : undefined,
        }
        : undefined,
    };

    return this.contractService.create(contractData, _id);
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
  @ApiResponse({
    status: 200,
    description: 'Return all Contracts with pagination',
  })
  @ApiResponse({ status: 404, description: 'Contracts not found' })
  @ApiQuery({
    name: 'bookingNumber',
    required: false,
    type: 'number',
    description: 'Filter by booking number',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'Filter by status ID',
  })
  @ApiQuery({
    name: 'reservingUser',
    required: false,
    type: 'string',
    description: 'Filter by reserving user email',
  })
  @ApiQuery({
    name: 'createdByUser',
    required: false,
    type: 'string',
    description: 'Filter by created by user ID',
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
  async findAll(@Query() filters: any) {
    if (filters.lang) {
      delete filters.lang;
    }
    if (filters.bookingNumber) {
      filters.bookingNumber = parseInt(filters.bookingNumber, 10);
    }

    if (filters.page) {
      filters.page = parseInt(filters.page, 10);
    }

    if (filters.limit) {
      filters.limit = parseInt(filters.limit, 10);
    }

    return this.contractService.findAll(filters);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Return Contract by id' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async findById(@Param('id') id: string) {
    return this.contractService.findById(id);
  }

  @Post(':id/report-event')
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  @ApiOperation({
    summary: 'Registra un evento en el timeline e ingresa un movimiento de dinero',
  })
  @ApiBody({
    type: ReportEventDTO,
    description: 'Datos del evento a registrar',
  })
  async reportEvent(
    @Param('id') contractId: string,
    @Body() body: ReportEventDTO,
    @Req() req: any,
  ) {
    const userId = req.user._id;
    return this.contractService.reportEvent(contractId, userId, body);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Contract updated' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiBody({
    type: UpdateContractDTO,
    description: 'Data to update a Contract',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
    TypeRoles.SUPERADMIN,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateContractDTO,
    @Req() req: IUserRequest,
  ) {
    const contractData = {
      ...body,
      extension: body.extension
        ? {
          ...body.extension,
          newEndDateTime: body.extension.newEndDateTime
            ? body.extension.newEndDateTime
            : undefined,
        }
        : undefined,
    };

    return this.contractService.update(id, contractData, req.user._id);
  }
}
