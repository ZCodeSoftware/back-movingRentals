import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateVehicleDTO {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    specs: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    image: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    category: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    owner: string;
}
