import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCategoryDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    disclaimerEn: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    disclaimerEs: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    image?: string;

}

export class UpdateCategoryDTO {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    disclaimerEn: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    disclaimerEs: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    image?: string;
}