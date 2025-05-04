import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTicketDTO {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    location: string;

    @IsNotEmpty()
    @ApiProperty()
    @IsNumber()
    totalPrice: number;

    @IsNotEmpty()
    @ApiProperty()
    @IsNumber()
    movingPrice: number;

    @IsNotEmpty()
    @ApiProperty()
    @IsNumber()
    cenotePrice: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;
}

export class UpdateTicketDTO {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    name: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    location: string;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    totalPrice: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    movingPrice: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    cenotePrice: number;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    category: string;
}

export class TicketFiltersDTO {
    @IsOptional()
    @ApiPropertyOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isActive?: boolean;
}