import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '../../../../core/domain/utils/regex/regex.utils';

export class LoginBodyDTO {
  @IsEmail()
  @ApiProperty()
  @IsNotEmpty({ message: 'The user email is required' })
  email: string;

  @IsString()
  @ApiProperty()
  @Matches(PASSWORD_REGEX, {
    message:
      'The password must have at least one number and be at least 8 characters long',
  })
  @IsNotEmpty({ message: 'The user password is required' })
  password: string;
}
