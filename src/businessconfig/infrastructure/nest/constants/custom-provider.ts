import { BusinessConfigService } from '../../../application/services/businessconfig.service';
import SymbolsBusinessConfig from '../../../symbols-businessconfig';
import { BusinessConfigRepository } from '../../mongo/repositories/businessconfig.repository';

export const businessconfigService = {
  provide: SymbolsBusinessConfig.IBusinessConfigService,
  useClass: BusinessConfigService,
};

export const businessconfigRepository = {
  provide: SymbolsBusinessConfig.IBusinessConfigRepository,
  useClass: BusinessConfigRepository,
};
