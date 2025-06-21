import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateBusinessConfigDTO {
    @IsOptional()
    @IsNumber(
        { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2, },
        { message: "USD value must be a valid number with up to 2 decimal places." }
    )
    @IsPositive()
    @ApiPropertyOptional({
        description: "The USD value for the business configuration.",
        type: Number,
        example: 100.00,
        required: false,
        minimum: 0,
        default: 0,
        name: "usd_value",
        format: "float"
    })
    usdValue?: number;

    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    @ApiProperty({
        description: "The ID of the branch this business configuration belongs to.",
        type: String,
        example: "507f1f77bcf86cd799439011",
        required: true,
        name: "branch_id"
    })
    branchId: string;
}

export class UpdateBusinessConfigDTO {
    @IsOptional()
    @IsNumber(
        { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2, },
        { message: "USD value must be a valid number with up to 2 decimal places." }
    )
    @IsPositive()
    @ApiPropertyOptional({
        description: "The USD value for the business configuration.",
        type: Number,
        example: 100.00,
        required: false,
        minimum: 0,
        default: 0,
        name: "usd_value",
        format: "float"
    })
    usdValue?: number;

    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    @ApiProperty({
        description: "The ID of the branch this business configuration belongs to.",
        type: String,
        example: "507f1f77bcf86cd799439011",
        required: true,
        name: "branch_id"
    })
    branchId: string;
}
