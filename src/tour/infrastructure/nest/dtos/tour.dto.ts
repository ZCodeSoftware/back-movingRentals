import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTourDTO {

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    description: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    recommendations: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    includes: string;

    @IsNotEmpty()
    @ApiProperty()
    @IsNumber()
    price: number;

    @IsString({ each: true })
    @IsOptional()
    @ApiPropertyOptional()
    images: string[];

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;
}
