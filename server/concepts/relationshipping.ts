import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface RelationshipDoc extends BaseDoc {
  user: ObjectId;
  relationName: string;
}

export interface RelatedUsersDoc extends BaseDoc {
  relationship: ObjectId;
  target: ObjectId;
}

/**
 * concept: Relationshipping [User]
 */
export default class RelationshippingConcept {
  public readonly relationTypes: DocCollection<RelationshipDoc>;
  public readonly relatedUsers: DocCollection<RelatedUsersDoc>;

  /**
   * Make an instance of Friending.
   */
  constructor(collectionName: string) {
    this.relationTypes = new DocCollection<RelationshipDoc>(collectionName);
    this.relatedUsers = new DocCollection<RelatedUsersDoc>(collectionName);
  }

  async createRelationship(user: ObjectId, relationName: string) {
    //Make sure no other relations with name
    const nameCheck = await this.relationTypes.readMany({ user: user, relationName: relationName });
    if (!(nameCheck.length == 0)) {
      throw new NotAllowedError("Cannot duplicate relation name: {0}", relationName);
    }
    const _id = await this.relationTypes.createOne({ user, relationName });
    return { msg: "Relation Created!", relation: await this.relationTypes.readOne({ _id }) };
  }

  async relate(creator: ObjectId, target: ObjectId, relationName: string) {
    const relation = await this.relationTypes.readOne({ user: creator, relationName: relationName });
    if (relation == null) {
      throw new NotFoundError("Relation name not found: {0}", relationName);
    }
    const relationship = relation._id;
    await this.relatedUsers.createOne({ relationship, target });
    return { msg: "Users Related!" };
  }

  async unrelate(creator: ObjectId, target: ObjectId, relationName: string) {
    const relation = await this.relationTypes.readOne({ user: creator, relationName: relationName });
    if (relation == null) {
      throw new NotFoundError("Relation name not found: {0}", relationName);
    }
    const relationship = relation._id;
    await this.relatedUsers.deleteOne({ relationship, target });
    return { msg: "Users Unrelated!" };
  }

  async deleteRelationship(user: ObjectId, relationName: string) {
    await this.relationTypes.deleteOne({ user, relationName });
    return { msg: "Relation Deleted!" };
  }

  async getRelationship(creator: ObjectId, target: ObjectId) {
    const userRelations = await this.relationTypes.readMany({ user: creator });
    let sharedRelations = [];
    for (let i = 0; i < userRelations.length; i++) {
      let curRelation = userRelations[i];
      let oid = curRelation._id;
      let checkRelation = await this.relatedUsers.readOne({ relationship: oid, target });
      if (!checkRelation == null) {
        sharedRelations.push(curRelation);
      }
    }
    return { msg: "Relations Queried!", relations: sharedRelations };
  }

  async getRelationships(creator: ObjectId) {
    const userRelations = await this.relationTypes.readMany({ user: creator });
    return { msg: "Relations Queried!", relations: userRelations };
  }

  async getRelatedUsers(creator: ObjectId, relationName: string) {
    const relation = await this.relationTypes.readOne({ user: creator, relationName: relationName });
    if (relation == null) {
      throw new NotFoundError(relationName);
    }
    const oid = relation._id;
    const relatedUsers = await this.relatedUsers.readMany({ relationship: oid });
    return { msg: "Relations Queried!", relatedUsers: relatedUsers };
  }
}
