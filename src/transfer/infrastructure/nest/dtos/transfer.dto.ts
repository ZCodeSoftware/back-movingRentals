import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

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
