import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export interface ITranslate {
  en: string;
  es: string;
}

export interface IFaqItem {
  question: ITranslate;
  answer: ITranslate;
}

export class FaqModel extends BaseModel {
  private _title: ITranslate;
  private _icon?: string;
  private _faqItems: IFaqItem[];

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      title: this._title,
      icon: this._icon,
      faqItems: this._faqItems,
    };
  }

  static create(faq: any): FaqModel {
    const newFaq = new FaqModel(new Identifier(faq._id));
    newFaq._title = faq.title;
    newFaq._icon = faq.icon;
    newFaq._faqItems = faq.faqItems

    return newFaq;
  }

  static hydrate(faq: any): FaqModel {
    const newFaq = new FaqModel(new Identifier(faq._id));
    newFaq._title = faq.title;
    newFaq._icon = faq.icon;
    newFaq._faqItems = faq.faqItems

    return newFaq;
  }
}
