import { Controller, Inject, UseGuards } from '@nestjs/common/decorators/core';
import {
  Body,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  Delete,
} from '@nestjs/common/decorators/http';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../auth/infrastructure/nest/decorators/role.decorator';
import { AuthGuards } from '../../../../auth/infrastructure/nest/guards/auth.guard';
import { RoleGuard } from '../../../../auth/infrastructure/nest/guards/role.guard';
import { TypeRoles } from '../../../../core/domain/enums/type-roles.enum';
import { IUserRequest } from '../../../../core/infrastructure/nest/dtos/custom-request/user.request';
import { IUserService } from '../../../domain/services/user.interface.service';
import SymbolsUser from '../../../symbols-user';
import {
  AutoCreateUserDTO,
  CreateUserDTO,
  UpdateUserDTO,
} from '../dtos/user.dto';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(
    @Inject(SymbolsUser.IUserService)
    private readonly userService: IUserService,
  ) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Create a new user' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: CreateUserDTO })
  async createUser(@Body() user: CreateUserDTO): Promise<any> {
    return await this.userService.create(user);
  }

  @Post('automatic-register')
  @ApiResponse({
    status: 201,
    description: 'Automatically register a new user',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: CreateUserDTO })
  @ApiQuery({
    name: 'lang',
    type: String,
    required: false,
    description: 'Language for the email notification',
  })
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
  )
  @UseGuards(AuthGuards, RoleGuard)
  async automaticRegister(
    @Body() user: AutoCreateUserDTO,
    @Headers('origin') requestHost: string,
    @Query('lang') lang: string,
  ): Promise<any> {
    return await this.userService.autoCreate(user, requestHost, lang);
  }

  @Get()
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
  )
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 200, description: 'Get all users' })
  async getAllUsers(@Query() query: any): Promise<any> {
    return await this.userService.findAll(query);
  }

  @Get('only-users')
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
  )
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 200, description: 'Get all users with USER role only' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, lastName or email',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by name',
  })
  @ApiQuery({
    name: 'lastName',
    required: false,
    type: String,
    description: 'Filter by lastName',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  async getAllOnlyUsers(@Query() query: any): Promise<any> {
    return await this.userService.findAllOnlyUsers(query);
  }

  @Get('non-users')
  @Roles(
    TypeRoles.ADMIN,
    TypeRoles.SUPERADMIN,
    TypeRoles.SELLER,
    TypeRoles.SUPERVISOR,
  )
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 200, description: 'Get all users that are not USER role' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, lastName or email',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by name',
  })
  @ApiQuery({
    name: 'lastName',
    required: false,
    type: String,
    description: 'Filter by lastName',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  async getAllNonUsers(@Query() query: any): Promise<any> {
    return await this.userService.findAllNonUsers(query);
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

  @Put(':id')
  @UseGuards(AuthGuards)
  @ApiResponse({ status: 200, description: 'User updated by admin' })
  @ApiBody({ type: UpdateUserDTO })
  async updateUserById(
    @Param('id') id: string,
    @Body() user: UpdateUserDTO,
  ): Promise<any> {
    return await this.userService.update(id, user);
  }

  @Get('forgot-password')
  @ApiResponse({ status: 200, description: 'Send email to reset password' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiQuery({ name: 'email', type: String })
  async forgotPassword(
    @Query('email') email: string,
    @Headers('origin') requestHost: string,
  ): Promise<any> {
    return await this.userService.forgotPassword(email, requestHost);
  }

  @Delete(':id')
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ status: 204, description: 'User soft-deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.userService.delete(id);
  }

  @Post(':id/reset-password')
  @Roles(TypeRoles.ADMIN, TypeRoles.SUPERADMIN)
  @UseGuards(AuthGuards, RoleGuard)
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully. Returns the new password.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully' },
        email: { type: 'string', example: 'user@example.com' },
        newPassword: { type: 'string', example: 'aB3dE5fG' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin cannot reset superadmin password' })
  async resetPasswordByAdmin(
    @Param('id') id: string,
    @Headers('origin') requestHost: string,
    @Req() req: IUserRequest,
  ): Promise<any> {
    const requestingUserId = req.user._id;
    return await this.userService.resetPasswordByAdmin(id, requestHost, requestingUserId);
  }
}
