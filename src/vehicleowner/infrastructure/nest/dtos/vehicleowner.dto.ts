import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

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
