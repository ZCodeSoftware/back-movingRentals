
export interface IContractExtension {
  newEndDateTime?: string | Date;
  paymentMethod?: string;
  extensionAmount?: number;
  commissionPercentage?: number;
  extensionStatus?: string;
}

export interface ICreateContract {
  booking: string;
  reservingUser: string;
  status?: string;
  extension?: IContractExtension;
}

export interface IUpdateContract {
  booking?: string;
  reservingUser?: string;
  status?: string;
  extension?: IContractExtension;
  eventType?: string
  newCart?: any;
  reasonForChange?: string;
}