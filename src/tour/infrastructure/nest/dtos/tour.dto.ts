import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

class TranslateDTO {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Traducción en inglés' })
    en?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ description: 'Traducción en español' })
    es?: string;
}

export class CreateTourDTO {

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones del nombre' })
    nameTranslations?: TranslateDTO;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    description: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de la descripción' })
    descriptionTranslations?: TranslateDTO;

    @IsNotEmpty()
    @ApiProperty()
    @IsNumber()
    price: number;

    @IsNotEmpty()
    @ApiProperty()
    @IsString()
    itinerary: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones del itinerario' })
    itineraryTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    capacity?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de la capacidad' })
    capacityTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    estimatedDuration?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de la duración estimada' })
    estimatedDurationTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    startDates?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de las fechas de inicio' })
    startDatesTranslations?: TranslateDTO;

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

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones del nombre' })
    nameTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    description?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de la descripción' })
    descriptionTranslations?: TranslateDTO;

    @IsOptional()
    @ApiPropertyOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @ApiPropertyOptional()
    @IsString()
    itinerary?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones del itinerario' })
    itineraryTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    capacity?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de la capacidad' })
    capacityTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    estimatedDuration?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de la duración estimada' })
    estimatedDurationTranslations?: TranslateDTO;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    startDates?: string;

    @ValidateNested()
    @Type(() => TranslateDTO)
    @IsOptional()
    @ApiPropertyOptional({ type: TranslateDTO, description: 'Traducciones de las fechas de inicio' })
    startDatesTranslations?: TranslateDTO;

    @IsString({ each: true })
    @IsOptional()
    @ApiPropertyOptional()
    images?: string[];

    @IsOptional()
    @ApiPropertyOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isActive?: boolean;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    category?: string;
}

export class TourFiltersDTO {
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