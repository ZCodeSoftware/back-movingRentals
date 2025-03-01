import { FaqSchema, Faq } from '../../../../core/infrastructure/mongo/schemas/public/faq.schema';

export const faqSchema = {
  name: Faq.name,
  schema: FaqSchema,
};
