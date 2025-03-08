import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

export class TranslateDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    en: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    es: string;

    [key: string]: string;
}

export class CreateFaqDTO {
    @ApiProperty()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => TranslateDTO)
    title: TranslateDTO;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FaqItemDTO)
    faqItems: FaqItemDTO[];
}


export class FaqItemDTO {
    @ApiProperty()
    @ValidateNested()
    @Type(() => TranslateDTO)
    question: TranslateDTO;

    @ApiProperty()
    @ValidateNested()
    @Type(() => TranslateDTO)
    answer: TranslateDTO;
}