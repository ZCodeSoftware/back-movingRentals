import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateVehicleOwnerDTO {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    @ApiProperty()
    commissionPercentage: number;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    phone: string;

    @IsBoolean()
    @IsOptional()
    @ApiPropertyOptional({ default: false })
    isConcierge?: boolean;
}

export class UpdateVehicleOwnerDTO {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    name: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    @ApiPropertyOptional()
    commissionPercentage: number;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    phone?: string;

    @IsBoolean()
    @IsOptional()
    @ApiPropertyOptional()
    isConcierge?: boolean;
}

export class VehicleOwnerQueryDTO {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Filter by name (partial match)' })
    name?: string;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @ApiPropertyOptional({ description: 'Filter by concierge status' })
    isConcierge?: boolean;

    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @ApiPropertyOptional({ description: 'Page number (default: 1)', default: 1 })
    page?: number;

    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @ApiPropertyOptional({ description: 'Items per page (default: 10)', default: 10 })
    limit?: number;
}