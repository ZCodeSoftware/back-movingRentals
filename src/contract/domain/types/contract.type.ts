
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
  concierge?: string;
  source?: string;
}

export interface IUpdateContract {
  booking?: string;
  reservingUser?: string;
  status?: string;
  extension?: IContractExtension;
  concierge?: string;
  source?: string;
  eventType?: string
  newCart?: any;
  reasonForChange?: string;
}