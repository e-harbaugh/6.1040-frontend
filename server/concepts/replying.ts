import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface ReplyDoc extends BaseDoc {
  content: string;
  isImage: boolean;
}

export interface ObjectRepliesDoc extends BaseDoc {
  object: ObjectId;
  reply: ObjectId;
}

/**
 * concept: Replying [Object]
 */
export default class ReplyingConcept {
  public readonly replies: DocCollection<ReplyDoc>;
  public readonly objectReplies: DocCollection<ObjectRepliesDoc>;

  /**
   * Make an instance of Replying.
   */
  constructor(collectionName: string) {
    this.replies = new DocCollection<ReplyDoc>(collectionName);
    this.objectReplies = new DocCollection<ObjectRepliesDoc>(collectionName);
  }

  async createReply(content: string, isImage = false) {
    const _id = await this.replies.createOne({ content: content, isImage: isImage });
    return { msg: "Reply Created!", reply_id: _id };
  }

  async deleteReply(reply: ObjectId) {
    await this.replies.deleteOne({ reply });
    return { msg: "Reply Deleted!" };
  }

  async assignReply(object: ObjectId, reply: ObjectId) {
    const postReply = await this.replies.readOne({ _id: reply });
    if (postReply == null) {
      throw new NotFoundError("Reply Object not Found: {0}", reply.toString());
    }
    await this.objectReplies.createOne({ object: object, reply: reply });
    return { msg: "Reply Assigned!" };
  }

  async removeReply(object: ObjectId, reply: ObjectId) {
    await this.objectReplies.deleteOne({ object: object, reply: reply });
    return { msg: "Reply Deleted!" };
  }

  async getReplyByObject(object: ObjectId) {
    const reply = await this.objectReplies.readMany({ object: object });
    if (!reply) {
      throw new NotFoundError(object.toString());
    }
    return { msg: "Replies found!", replies: reply.map((x: ObjectRepliesDoc) => x.reply) };
  }

  async getReplyByID(id: ObjectId) {
    const reply = await this.replies.readOne({ id: id });
    if (!reply) {
      throw new NotFoundError(id.toString());
    }
    return { msg: "Reply found!", reply: reply };
  }
}
