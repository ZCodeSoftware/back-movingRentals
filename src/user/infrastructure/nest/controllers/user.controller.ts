import { Controller, Inject } from '@nestjs/common/decorators/core';
import { Body, Get, Param, Post, Put } from '@nestjs/common/decorators/http';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IUserService } from '../../../domain/services/user.interface.service';
import SymbolsUser from '../../../symbols-user';
import { CreateUserDTO, UpdateUserDTO } from '../dtos/user.dto';

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

  @Get('detail/:id')
  @ApiResponse({ status: 200, description: 'Get user by Id' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<any> {
    return await this.userService.findById(id);
  }

  @Put('/:id')
  @ApiResponse({ status: 200, description: 'Update user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiBody({ type: UpdateUserDTO })
  async updateUser(
    @Body() user: UpdateUserDTO,
    @Param('id') id: string,
  ): Promise<any> {
    return await this.userService.update(id, user);
  }
}
