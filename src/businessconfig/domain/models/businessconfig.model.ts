import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';

export class BusinessConfigModel extends BaseModel {
  private _usdValue?: number;
  private _branch: string;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      usdValue: this._usdValue,
      branch: this._branch,
    };
  }

  addBranch(branchId: string): void {
    this._branch = branchId;
  }

  getBranch(): string {
    return this._branch;
  }

  static create(businessconfig: any): BusinessConfigModel {
    const newBusinessConfig = new BusinessConfigModel(new Identifier(businessconfig._id));
    newBusinessConfig._usdValue = businessconfig.usdValue;
    if (businessconfig.branchId) {
      newBusinessConfig._branch = businessconfig.branchId;
    }

    return newBusinessConfig;
  }

  static hydrate(businessconfig: any): BusinessConfigModel {
    const newBusinessConfig = new BusinessConfigModel(new Identifier(businessconfig._id));
    newBusinessConfig._usdValue = businessconfig.usdValue;
    newBusinessConfig._branch = businessconfig.branch;

    return newBusinessConfig;
  }
}
