import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTourDTO {
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

    @IsString({ each: true })
    @IsOptional()
    @ApiPropertyOptional()
    images: string[];

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;
}
