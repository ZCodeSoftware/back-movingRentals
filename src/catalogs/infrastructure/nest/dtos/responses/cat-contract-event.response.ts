import { ApiProperty } from '@nestjs/swagger';

export class CatContractEventResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;
}
