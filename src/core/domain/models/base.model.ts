import { Identifier } from '../value-objects/identifier';

const isModel = (v: any): v is BaseModel => {
  return v instanceof BaseModel;
};
export abstract class BaseModel {
  protected _id: Identifier;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  constructor(id?: Identifier) {
    this._id = id;
    this._createdAt = new Date();
    this._updatedAt = null;
  }
  get id() {
    return this._id;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }
  public equals(object?: BaseModel): boolean {
    if (object == null || object == undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!isModel(object)) {
      return false;
    }
    return this._id.equals(object._id);
  }
  protected plain(): Record<string, any> {
    return { createdAt: this.createdAt, updatedAt: this.updatedAt };
  }
}
