import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

export class TranslateDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    en: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    es: string;

    [key: string]: string;
}

export class CreateChoosingDTO {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => TranslateDTO)
    title: TranslateDTO;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => TranslateDTO)
    text: TranslateDTO;
}

