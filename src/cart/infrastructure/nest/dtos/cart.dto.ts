import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsNumber, IsString } from "class-validator";

export class DatesDTO {
    start: Date;
    end: Date;
}

export class TravelersDTO {
    @IsNumber()
    @ApiProperty()
    adults: number;

    @IsNumber()
    @ApiProperty()
    childrens: number;
}

export class TransferDTO {
    @IsDate()
    @ApiProperty()
    date: Date;

    @IsString()
    @ApiProperty()
    transfer: string;
}
export class UpdateCartDTO {
    @IsString()
    @ApiProperty()
    branch: string;

    @ApiProperty()
    transfer: TransferDTO[];

    @ApiProperty()
    travelers: TravelersDTO

    @ApiProperty()
    selectedItems: {
        vehicle: string;
        total: number;
        dates: DatesDTO
    }[];

    @ApiProperty()
    selectedTours: {
        tour: string;
        date: Date;
    }[];
}
