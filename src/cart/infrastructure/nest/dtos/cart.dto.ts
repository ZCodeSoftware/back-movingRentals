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
    child: number;
}

export class TransferDTO {
    @IsDate()
    @ApiProperty()
    date: Date;

    @IsString()
    @ApiProperty()
    transfer: string;

    @ApiProperty()
    passengers: TravelersDTO

    @IsNumber()
    @ApiProperty()
    quantity: number;
}
export class UpdateCartDTO {
    @IsString()
    @ApiProperty()
    branch: string;

    @ApiProperty()
    transfer: TransferDTO[];

    @ApiProperty()
    selectedItems: {
        vehicle: string;
        total: number;
        dates: DatesDTO
        passengers: TravelersDTO;
    }[];

    @ApiProperty()
    selectedTours: {
        tour: string;
        date: Date;
        quantity: number;
        passengers: TravelersDTO;
    }[];

    @ApiProperty()
    selectedTickets: {
        ticket: string;
        date: Date;
        quantity: number;
        passengers: TravelersDTO;
    }[];
}
