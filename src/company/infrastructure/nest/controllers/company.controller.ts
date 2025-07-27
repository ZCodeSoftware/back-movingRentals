import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import { CompanyModel } from '../../../domain/models/company.model';
import { ICompanyService } from '../../../domain/services/company.interface.service';
import SymbolsCompany from '../../../symbols-company';
import { AddBranchToCompanyDTO, CreateCompanyDTO } from '../dtos/company.dto';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(
    @Inject(SymbolsCompany.ICompanyService)
    private readonly companyService: ICompanyService,
  ) { }

  @Post()
  @Roles(TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 201, description: 'Create a new company' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: CreateCompanyDTO })
  async createCompany(@Body() body: CreateCompanyDTO): Promise<CompanyModel> {
    return this.companyService.createCompany(body);
  }

  @Get()
  @UseGuards(AuthGuards)
  @ApiResponse({ status: 200, description: 'Get all companies' })
  @ApiResponse({ status: 404, description: 'Table is empty' })
  async findAll(): Promise<CompanyModel[]> {
    return this.companyService.findAll();
  }

  @Get('user')
  @UseGuards(AuthGuards)
  @ApiResponse({ status: 200, description: 'Get user by Id' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUserId(@Req() req: IUserRequest): Promise<CompanyModel> {
    const { _id } = req.user;

    return this.companyService.findByUserId(_id);
  }

  @Put()
  @Roles(TypeRoles.ADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 201, description: 'Update a company' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async addBranchesToCompany(
    @Body() body: AddBranchToCompanyDTO,
  ): Promise<CompanyModel> {
    return this.companyService.addBranchesToCompany(body);
  }
}
