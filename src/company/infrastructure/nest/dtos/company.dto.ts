import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ONLY_LETTERS_REGEX } from '../../../../core/domain/utils/regex/regex.utils';

export class CreateCompanyDTO {
  @IsString()
  @ApiProperty()
  @Matches(ONLY_LETTERS_REGEX, {
    message: 'The user name can only contain letters (including accents and ñ)',
  })
  @IsNotEmpty({ message: 'The user name is required' })
  name: string;

  @IsOptional()
  @ApiPropertyOptional()
  users: string[];
}

export class AddBranchToCompanyDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  branches: string[];
}
