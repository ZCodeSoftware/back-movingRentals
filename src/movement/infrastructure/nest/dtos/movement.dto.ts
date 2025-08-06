import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { TypeCatTypeMovement } from "../../../../core/domain/enums/type-cat-type-movement";

export class CreateMovementDTO {
    @IsNotEmpty()
    @IsEnum(TypeCatTypeMovement)
    @ApiProperty({
        description: "Type of the movement",
        enum: TypeCatTypeMovement,
    })
    type: TypeCatTypeMovement;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: "Detail of the movement",
        type: String,
    })
    detail: string;

    @IsNotEmpty()
    @ApiProperty({
        description: "Amount of the movement",
        type: Number,
    })
    amount: number;

    @IsNotEmpty()
    @ApiProperty({
        description: "Date of the movement",
        type: Date,
    })
    date: Date;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        description: "Vehicle associated with the movement",
        type: String,
    })
    vehicle?: string;
}
