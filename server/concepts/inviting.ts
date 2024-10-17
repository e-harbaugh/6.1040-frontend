import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface InviteDoc extends BaseDoc {
  user: ObjectId;
  thing: ObjectId;
}

/**
 * concept: Posting [Author]
 */
export default class InvitingConcept {
  public readonly invites: DocCollection<InviteDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.invites = new DocCollection<InviteDoc>(collectionName);
  }

  async inviteUser(user: ObjectId, thing: ObjectId) {
    const _id = await this.invites.createOne({ user, thing });
    return { msg: "Invite successfully created!", invite: await this.invites.readOne({ _id }) };
  }

  async deleteInvite(user: ObjectId, thing: ObjectId) {
    const invite = await this.invites.readOne({ user: user, thing: thing });
    if (invite == null) {
      throw new NotFoundError(`Invite for ${user} does not exist!`);
    }
    const _id = invite._id;
    await this.invites.deleteOne({ _id });
    return { msg: "Invite removed successfully!" };
  }

  async checkInvites(user: ObjectId) {
    return { msg: "Invites Retrieved", invites: await this.invites.readMany({ user: user }, { sort: { _id: -1 } }) };
  }

  async userHasInvite(user: ObjectId, thing: ObjectId) {
    const invites = await this.invites.readMany({ user: user }, { sort: { _id: -1 } });
    let found = false;
    for (let i = 0; i < invites.length; i++) {
      if (thing.toString() === invites[i].thing.toString()) {
        found = true;
      }
    }
    if (!found) {
      throw new NotFoundError(thing.toString());
    }
    return { msg: "Invite Confirmed!" };
  }
}
