import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePromotionalPriceDTO {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: 'Model ID' })
    model: string;

    @IsDateString()
    @IsNotEmpty()
    @ApiProperty({ description: 'Start date of the promotion' })
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    @ApiProperty({ description: 'End date of the promotion' })
    endDate: string;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price per hour' })
    price?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price for 4 hours' })
    pricePer4?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price for 8 hours' })
    pricePer8?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price for 24 hours' })
    pricePer24?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price per week' })
    pricePerWeek?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price per month' })
    pricePerMonth?: number;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Description of the promotion' })
    description?: string;
}

export class UpdatePromotionalPriceDTO {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Model ID' })
    model?: string;

    @IsDateString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Start date of the promotion' })
    startDate?: string;

    @IsDateString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'End date of the promotion' })
    endDate?: string;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price per hour' })
    price?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price for 4 hours' })
    pricePer4?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price for 8 hours' })
    pricePer8?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price for 24 hours' })
    pricePer24?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price per week' })
    pricePerWeek?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Promotional price per month' })
    pricePerMonth?: number;

    @IsBoolean()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Is the promotion active' })
    isActive?: boolean;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Description of the promotion' })
    description?: string;
}
