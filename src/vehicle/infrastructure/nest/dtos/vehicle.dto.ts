import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

class ReservationDTO {
    @IsDateString()
    @IsNotEmpty()
    @ApiProperty({ description: "Fecha de inicio de la reserva" })
    start: string;

    @IsDateString()
    @IsNotEmpty()
    @ApiProperty({ description: "Fecha de fin de la reserva" })
    end: string;
}

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

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    model: string;
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

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReservationDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: [ReservationDTO], description: "Listado de reservas del vehículo" })
    reservations?: ReservationDTO[];

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    category?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    owner?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    model?: string;
}

export class UpdatePriceByModelDTO {
    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional()
    price?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional()
    pricePer4?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional()
    pricePer8?: number;

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional()
    pricePer24?: number;
}