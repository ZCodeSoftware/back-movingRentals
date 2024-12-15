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

    @IsNotEmpty()
    @ApiProperty()
    @IsNumber()
    price: number;

    @IsNotEmpty()
    @ApiProperty()
    @IsString()
    itinerary: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    capacity?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    estimatedDuration?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    startDates?: string;

    @IsString({ each: true })
    @IsOptional()
    @ApiPropertyOptional()
    images?: string[];

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;
}
