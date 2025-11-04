
export interface IContractExtension {
  newEndDateTime?: string | Date;
  paymentMethod?: string;
  paymentMedium?: string;
  depositNote?: string;
  extensionAmount?: number;
  commissionPercentage?: number;
  commissionTotal?: number;
  extensionStatus?: string;
}

export interface ICreateContract {
  booking: string;
  reservingUser: string;
  status?: string;
  extension?: IContractExtension;
  concierge?: string;
  source?: string;
  sendEmail?: boolean;
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