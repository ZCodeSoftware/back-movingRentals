import { ContractSchema, Contract } from '../../../../core/infrastructure/mongo/schemas/public/contract.schema';

export const contractSchema = {
  name: Contract.name,
  schema: ContractSchema,
};
