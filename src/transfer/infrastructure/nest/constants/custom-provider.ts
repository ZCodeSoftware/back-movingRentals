import SymbolsCatalogs from '../../../../catalogs/symbols-catalogs';
import { Transfer, TransferSchema } from '../../../../core/infrastructure/mongo/schemas/public/transfer.schema';
import { TransferService } from '../../../application/services/transfer.service';
import SymbolsTransfer from '../../../symbols-transfer';
import { CatCategoryRepository } from '../../mongo/repositories/cat-category.repository';
import { TransferRepository } from '../../mongo/repositories/transfer.repository';

export const transferService = {
  provide: SymbolsTransfer.ITransferService,
  useClass: TransferService,
};

export const transferRepository = {
  provide: SymbolsTransfer.ITransferRepository,
  useClass: TransferRepository,
};

export const catCategoryRepository = {
  provide: SymbolsCatalogs.ICatCategoryRepository,
  useClass: CatCategoryRepository,
}

export const transferSchema = {
  name: Transfer.name,
  schema: TransferSchema,
};
