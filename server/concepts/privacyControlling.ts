import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PrivacyAttributeDoc extends BaseDoc {
  thing: ObjectId;
  attributeName: string;
}

export interface AtrributeValueDoc extends BaseDoc {
  privacyAttribute: ObjectId;
  value: string;
}

/**
 * concept: privacyControlling [User]
 */
export default class PrivacyControllingConcept {
  public readonly privacyAttributes: DocCollection<PrivacyAttributeDoc>;
  public readonly attributeValues: DocCollection<AtrributeValueDoc>;

  /**
   * Make an instance of Friending.
   */
  constructor(collectionName: string) {
    this.privacyAttributes = new DocCollection<PrivacyAttributeDoc>(collectionName);
    this.attributeValues = new DocCollection<AtrributeValueDoc>(collectionName);
  }

  async createAttribute(thing: ObjectId, attributeName: string) {
    const _id = await this.privacyAttributes.createOne({ thing, attributeName });
    return { msg: "Attribute Created!", attribute: await this.privacyAttributes.readOne({ _id }) };
  }

  async assignAttribute(thing: ObjectId, attributeName: string, value: string) {
    const attribute = await this.privacyAttributes.readOne({ thing: thing, attributeName });
    if (attribute == null) {
      throw new NotFoundError(attributeName);
    }
    const oid = attribute._id;
    await this.attributeValues.createOne({ privacyAttribute: oid, value });
    return { msg: "Attribute Assigned!" };
  }

  //This function returns true if no attributeName is found
  async anyValueSatisfies(thing: ObjectId, attributeName: string, values: string[]) {
    const attribute = await this.privacyAttributes.readOne({ thing, attributeName });
    if (!attribute) {
      return true;
    }
    const oid = attribute._id;
    const curAttributeValues = await this.attributeValues.readMany({ privacyAttribute: oid });
    let found = false;
    for (let i = 0; i < curAttributeValues.length; i++) {
      for (let j = 0; j < values.length; j++) {
        if (values[j] === curAttributeValues[i].value) {
          found = true;
        }
      }
    }
    return { msg: "Values Checked!", satisfies: found };
  }

  async assertAnyValueSatisfies(thing: ObjectId, attributeName: string, values: string[]) {
    const attribute = await this.privacyAttributes.readOne({ thing, attributeName });
    if (attribute == null) {
      return true;
    }
    const oid = attribute._id;
    const curAttributeValues = await this.attributeValues.readMany({ privacyAttribute: oid });
    let found = false;
    for (let i = 0; i < curAttributeValues.length; i++) {
      for (let j = 0; j < values.length; j++) {
        if (values[j] === curAttributeValues[i].value) {
          found = true;
        }
      }
    }
    if (!found) {
      throw new UnsatisfiedError(attributeName, values);
    }
    return { msg: "Satisfied Asserted!" };
  }

  async deleteAttribute(thing: ObjectId, attributeName: string) {
    await this.privacyAttributes.deleteOne({ thing, attributeName });
    return { msg: "Attribute Deleted!" };
  }

  async getAttributes(thing: ObjectId) {
    const attributes = await this.privacyAttributes.readMany({ thing });
    return { msg: "Attributes Queried", attributes: attributes };
  }

  async getAttributeValues(thing: ObjectId, attributeName: string) {
    const attribute = await this.privacyAttributes.readOne({ thing, attributeName });
    if (attribute == null) {
      throw new NotFoundError(attributeName);
    }
    const oid = attribute._id;
    const attributeValues = await this.attributeValues.readMany({ privacyAttribute: oid });
    return { msg: "attributes Queried!", attributeValues: attributeValues };
  }
}

export class InvalidActionError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly action: string,
    public readonly object: ObjectId,
  ) {
    super("{0} cannot perform {1} on {2}!", user, action, object);
  }
}

export class UnsatisfiedError extends NotAllowedError {
  constructor(
    public readonly attributeName: string,
    public readonly values: string[],
  ) {
    super("{0} is not satisfied by {1}!", attributeName, values);
  }
}
