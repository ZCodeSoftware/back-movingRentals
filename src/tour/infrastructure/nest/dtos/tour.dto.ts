import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

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

    @IsOptional()
    @ApiPropertyOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;
}

export class UpdateTourDTO {

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    name?: string

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description?: string;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsString()
    itinerary?: string;

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
    @IsOptional()
    @ApiPropertyOptional()
    category?: string;
}

export class TourFiltersDTO {
    @IsOptional()
    @ApiPropertyOptional()
    @IsBoolean()
    isActive?: boolean;
}