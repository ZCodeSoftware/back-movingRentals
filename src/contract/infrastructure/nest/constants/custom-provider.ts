import { ContractService } from '../../../application/services/contract.service';
import SymbolsContract from '../../../symbols-contract';
import { ContractRepository } from '../../mongo/repositories/contract.repository';

export const contractService = {
  provide: SymbolsContract.IContractService,
  useClass: ContractService,
};

export const contractRepository = {
  provide: SymbolsContract.IContractRepository,
  useClass: ContractRepository,
};
