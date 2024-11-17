import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreatePriceConditionDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;
}