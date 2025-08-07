export interface IContractExtensionDTO {
  newEndDateTime?: string | Date;
  paymentMethod?: string;
  extensionAmount?: number;
  commissionPercentage?: number;
  extensionStatus?: string;
}

export interface ICreateContract {
  booking: string;
  contractNumber: number;
  reservingUser: string;
  status?: string;
  extension?: IContractExtensionDTO;
}