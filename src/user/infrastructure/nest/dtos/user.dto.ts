import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import {
  ONLY_LETTERS_REGEX,
  PASSWORD_REGEX,
} from '../../../../core/domain/utils/regex/regex.utils';

export class CreateUserDTO {
  @IsString()
  @ApiProperty()
  @Matches(ONLY_LETTERS_REGEX, {
    message: 'The user name can only contain letters (including accents and ñ)',
  })
  @IsNotEmpty({ message: 'The user name is required' })
  name: string;

  @IsString()
  @ApiProperty()
  @Matches(ONLY_LETTERS_REGEX, {
    message:
      'The user last name can only contain letters (including accents and ñ)',
  })
  @IsNotEmpty({ message: 'The user name is required' })
  lastName: string;

  @IsEmail()
  @ApiProperty()
  @IsNotEmpty({ message: 'The user email is required' })
  email: string;

  @IsString()
  @ApiProperty()
  @Matches(PASSWORD_REGEX, {
    message:
      'The password must have at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @IsNotEmpty({ message: 'The user password is required' })
  password: string;

  @IsBoolean()
  @ApiProperty()
  @IsNotEmpty({ message: 'The user newsletter is required' })
  newsletter: boolean;
}

export class UpdateUserDTO {
  @IsString()
  @ApiPropertyOptional()
  @Matches(ONLY_LETTERS_REGEX, {
    message: 'The user name can only contain letters (including accents and ñ)',
  })
  @IsOptional()
  name?: string;

  @IsString()
  @ApiPropertyOptional()
  @Matches(ONLY_LETTERS_REGEX, {
    message:
      'The user last name can only contain letters (including accents and ñ)',
  })
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @ApiPropertyOptional()
  @IsOptional()
  email?: string;

  @IsString()
  @ApiPropertyOptional()
  @Matches(PASSWORD_REGEX, {
    message:
      'The password must have at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @IsOptional()
  password?: string;

  @IsString()
  @ApiPropertyOptional()
  @IsOptional()
  cellphone?: string;

  @IsBoolean()
  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @ApiPropertyOptional()
  @IsOptional()
  newsletter?: boolean;
}