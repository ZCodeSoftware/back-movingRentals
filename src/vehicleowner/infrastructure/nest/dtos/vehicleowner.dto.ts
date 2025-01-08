import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

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
}