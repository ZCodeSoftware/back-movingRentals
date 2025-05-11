import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTransferDTO {
    @IsString()
    @ApiProperty()
    @IsNotEmpty()
    name: string;

    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    description?: string;

    @IsNumber()
    @ApiProperty()
    @IsNotEmpty()
    capacity: number;

    @IsString()
    @ApiProperty()
    @IsNotEmpty()
    estimatedDuration: string;

    @IsNumber()
    @ApiProperty()
    @IsNotEmpty()
    price: number;

    @IsString()
    @ApiProperty()
    @IsNotEmpty()
    category: string

}

export class UpdateTransferDTO {
    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    name?: string;

    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    description?: string;

    @IsNumber()
    @ApiPropertyOptional()
    @IsOptional()
    capacity?: number;

    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    estimatedDuration?: string;

    @IsNumber()
    @ApiPropertyOptional()
    @IsOptional()
    price?: number;

    @IsBoolean()
    @ApiPropertyOptional()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    category?: string
}

export class TransferFiltersDTO {
    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isActive?: boolean;
}