import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateVehicleDTO {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    tag: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description: string;

    @IsString({ each: true })
    @IsOptional()
    @ApiPropertyOptional()
    images?: string[];

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    pricePer4?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    pricePer8?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    pricePer24?: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    capacity: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    minRentalHours: number;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    owner: string;
}


export class UpdateVehicleDTO {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    name?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    tag?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description?: string;

    @IsString({ each: true })
    @IsOptional()
    @ApiPropertyOptional()
    images?: string[];

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    pricePer4?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    pricePer8?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    pricePer24?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    capacity?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    minRentalHours?: number;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    category?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    owner?: string;
}