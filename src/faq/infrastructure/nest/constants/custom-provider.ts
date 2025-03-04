import { FaqService } from '../../../application/services/faq.service';
import SymbolsFaq from '../../../symbols-faq';
import { FaqRepository } from '../../mongo/repositories/faq.repository';

export const faqService = {
  provide: SymbolsFaq.IFaqService,
  useClass: FaqService,
};

export const faqRepository = {
  provide: SymbolsFaq.IFaqRepository,
  useClass: FaqRepository,
};
