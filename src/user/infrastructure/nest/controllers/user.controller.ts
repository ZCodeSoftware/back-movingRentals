import { Controller, Inject, UseGuards } from '@nestjs/common/decorators/core';
import { Body, Get, Headers, Post, Put, Query, Req } from '@nestjs/common/decorators/http';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import { IUserService } from '../../../domain/services/user.interface.service';
import SymbolsUser from '../../../symbols-user';
import { CreateUserDTO, UpdateUserDTO } from '../dtos/user.dto';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(
    @Inject(SymbolsUser.IUserService)
    private readonly userService: IUserService,
  ) { }

  @Post()
  @ApiResponse({ status: 201, description: 'Create a new user' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: CreateUserDTO })
  async createUser(@Body() user: CreateUserDTO): Promise<any> {
    return await this.userService.create(user);
  }

  @Get()
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN, TypeRoles.SELLER, TypeRoles.SUPERVISOR)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 200, description: 'Get all users' })
  async getAllUsers(@Query() query: any): Promise<any> {
    return await this.userService.findAll(query);
  }

  @Get('detail')
  @UseGuards(AuthGuards)
  @ApiResponse({ status: 200, description: 'Get user by Id' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Req() req: IUserRequest): Promise<any> {
    const { _id } = req.user;

    return await this.userService.findById(_id);
  }

  @Put()
  @UseGuards(AuthGuards)
  @ApiResponse({ status: 200, description: 'Update user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: UpdateUserDTO })
  async updateUser(
    @Body() user: UpdateUserDTO,
    @Req() req: IUserRequest,
  ): Promise<any> {
    const { _id } = req.user;

    return await this.userService.update(_id, user);
  }

  @Get('forgot-password')
  @ApiResponse({ status: 200, description: 'Send email to reset password' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiQuery({ name: 'email', type: String })
  async forgotPassword(@Query('email') email: string, @Headers('origin') requestHost: string,): Promise<any> {

    return await this.userService.forgotPassword(email, requestHost);
  }
}
