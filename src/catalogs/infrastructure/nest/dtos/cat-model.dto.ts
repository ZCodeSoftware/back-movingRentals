import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateModelDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class UpdateModelDTO {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name: string;
}