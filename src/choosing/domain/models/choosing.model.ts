import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export interface ITranslate {
  en: string;
  es: string;
}

export class ChoosingModel extends BaseModel {
  private _title: ITranslate;
  private _icon?: string;
  private _text: ITranslate;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      title: this._title,
      icon: this._icon,
      text: this._text,
    };
  }

  static create(choosing: any): ChoosingModel {
    const newChoosing = new ChoosingModel(new Identifier(choosing._id));
    newChoosing._title = choosing.title;
    newChoosing._icon = choosing.icon;
    newChoosing._text = choosing.text;

    return newChoosing;
  }

  static hydrate(choosing: any): ChoosingModel {
    const newChoosing = new ChoosingModel(new Identifier(choosing._id));
    newChoosing._title = choosing.title;
    newChoosing._icon = choosing.icon;
    newChoosing._text = choosing.text

    return newChoosing;
  }
}
