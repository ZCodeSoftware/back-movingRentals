import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { TypeCatPaymentMethodAdmin } from "../../../../core/domain/enums/type-cat-payment-method-admin";
import { TypeCatTypeMovement } from "../../../../core/domain/enums/type-cat-type-movement";
import { TypeMovementDirection } from "../../../../core/domain/enums/type-movement-direction";

export class UpdateMovementDTO {
  @IsOptional()
  @IsEnum(TypeCatTypeMovement)
  @ApiPropertyOptional({ description: "Type of the movement", enum: TypeCatTypeMovement })
  type?: TypeCatTypeMovement;

  @IsOptional()
  @IsEnum(TypeMovementDirection)
  @ApiPropertyOptional({ description: "Direction of the movement (IN for income, OUT for expense)", enum: TypeMovementDirection, example: TypeMovementDirection.OUT })
  direction?: TypeMovementDirection;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Detail of the movement", type: String })
  detail?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: "Amount of the movement", type: Number })
  amount?: number;

  @IsOptional()
  @ApiPropertyOptional({ description: "Date of the movement", type: Date })
  date?: Date;

  @IsOptional()
  @IsEnum(TypeCatPaymentMethodAdmin)
  @ApiPropertyOptional({ description: "Payment method for the movement", enum: TypeCatPaymentMethodAdmin, example: TypeCatPaymentMethodAdmin.MXN })
  paymentMethod?: TypeCatPaymentMethodAdmin;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Vehicle associated with the movement", type: String })
  vehicle?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Beneficiary associated with the movement", type: String })
  beneficiary?: string;
}
