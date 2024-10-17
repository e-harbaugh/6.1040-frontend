import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Collaborating, ContentCommunitying, Friending, Inviting, Posting, PrivacyControlling, Relationshipping, Replying, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { RelationshipDoc } from "./concepts/relationshipping";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.
  @Router.post("/users/relations")
  async createRelationship(session: SessionDoc, name: string) {
    const user = Sessioning.getUser(session);
    const created = await Relationshipping.createRelationship(user, name);
    return { msg: created.msg, get: created.relation };
  }
  @Router.get("/users/relations")
  async getRelationships(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const relations = await Relationshipping.getRelationships(user);
    return { msg: relations.msg, get: relations.relations };
  }
  @Router.delete("/users/relations")
  async deleteRelationship(session: SessionDoc, name: string) {
    const user = Sessioning.getUser(session);
    const msg = await Relationshipping.deleteRelationship(user, name);
    return { msg: msg.msg };
  }
  //Related Users
  @Router.post("/users/relations/:relation")
  async relate(session: SessionDoc, target: string, relation: string) {
    const user = Sessioning.getUser(session);
    const target_id = (await Authing.getUserByUsername(target))._id;
    const created = await Relationshipping.relate(user, target_id, relation);
    return { msg: created.msg };
  }
  @Router.get("/users/relations/:relation")
  async getRelatedUsers(session: SessionDoc, relation: string) {
    const user = Sessioning.getUser(session);
    const relations = await Relationshipping.getRelatedUsers(user, relation);
    return { msg: relations.msg, relatedUsers: relations.relatedUsers };
  }
  @Router.delete("/users/relations/:relation")
  async unrelate(session: SessionDoc, target: string, relation: string) {
    const user = Sessioning.getUser(session);
    const target_id = (await Authing.getUserByUsername(target))._id;
    const msg = await Relationshipping.unrelate(user, target_id, relation);
    return { msg: msg.msg };
  }
  //Replies
  @Router.post("/posts/:id/replies")
  async reply(session: SessionDoc, id: string, content: string) {
    //We need to check if the user is allowed to post a reply by the poster's settings
    await helpers.checkRelationPermission(session, id, "reply");
    const post = await Posting.getPostByID(id);
    const replyMsg = await Replying.createReply(content, false);
    const msg = await Replying.assignReply(post.post._id, replyMsg.reply_id);
    return { msg: msg.msg };
  }
  @Router.get("/posts/:id/replies")
  async getReplies(session: SessionDoc, id: string) {
    //We need to check if the user is allowed to by the poster's settings
    await helpers.checkRelationPermission(session, id, "readReplies");

    //Now Start Reply
    const replies = await Replying.getReplyByObject(new ObjectId(id));
    return { msg: replies.msg, replies: replies.replies };
  }
  @Router.delete("/posts/:id/replies/:replyid")
  async deleteReply(session: SessionDoc, replyid: string) {
    //Here the settings actually depend on the reply's permissions
    await helpers.checkRelationPermission(session, replyid, "delete");

    const msg = await Replying.deleteReply(new ObjectId(replyid));
    return { msg: msg.msg };
  }
  //Collabs
  @Router.post("/posts/:id/collaborators")
  async joinCollaborator(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const post = await Posting.getPostByID(id);
    await Inviting.userHasInvite(user, post.post._id);
    await Inviting.deleteInvite(user, post.post._id);
    const msg = await Collaborating.addColab(user, post.post._id);

    return { msg: msg.msg, colab: msg.colab };
  }
  @Router.get("/posts/:id/collaborators")
  async getCollaborators(session: SessionDoc, id: string) {
    //We need to check if the user is allowed to by the poster's settings
    await helpers.checkRelationPermission(session, id, "read");

    //Now Start Reply
    const colabs = await Collaborating.getColabs(new ObjectId(id));
    return { msg: colabs.msg, replies: colabs.colabs };
  }
  @Router.delete("/posts/:id/collaborators/:targetName")
  async deleteColab(session: SessionDoc, id: string, targetName: string) {
    const user = Sessioning.getUser(session);
    const target = await Authing.getUserByUsername(targetName);
    await Posting.assertAuthorIsUser(new ObjectId(id), user);
    const msg = await Collaborating.removeColab(target._id, new ObjectId(id));
    return { msg: msg.msg };
  }
  //Invites
  @Router.post("/invites/:username/:id")
  async inviteUser(session: SessionDoc, username: string, id: string) {
    const user = Sessioning.getUser(session);
    const target = await Authing.getUserByUsername(username);
    await Posting.assertAuthorIsUser(new ObjectId(id), user);
    const msg = await Inviting.inviteUser(target._id, new ObjectId(id));
    return { msg: msg.msg, invite: msg.invite };
  }
  @Router.get("/users/invites")
  async checkInvites(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const invites = await Inviting.checkInvites(user);
    return { msg: invites.msg, invites: invites.invites };
  }
  @Router.delete("/users/invites/:objectid")
  async deleteInvite(session: SessionDoc, objectid: string) {
    const user = Sessioning.getUser(session);
    const msg = await Inviting.deleteInvite(user, new ObjectId(objectid));
    return { msg: msg.msg };
  }
  //Community
  @Router.post("/communities")
  async createCommunity(session: SessionDoc, communityName: string, notPrivate: boolean = false) {
    const user = Sessioning.getUser(session);
    const msg = await ContentCommunitying.createCommunity(communityName, user);
    if (!notPrivate) {
      //If it's a private community, set up necessary concepts to maintain privacy
      const community = await ContentCommunitying.getCommunityByName(communityName);
      await Relationshipping.createRelationship(community.community._id, "member");
      await PrivacyControlling.createAttribute(community.community._id, "read");
      await PrivacyControlling.createAttribute(community.community._id, "communityPost");
      await PrivacyControlling.assignAttribute(community.community._id, "read", "member");
      await PrivacyControlling.assignAttribute(community.community._id, "communityPost", "member");
    }
    return { msg: msg.msg, communitiy: msg.community };
  }
  @Router.get("/communities")
  async getCommunities() {
    const msg = await ContentCommunitying.getCommunities();
    return { msg: msg.msg, communities: msg.communities };
  }
  @Router.delete("/communities/:communityName")
  async deleteCommunity(session: SessionDoc, communityName: string) {
    const user = Sessioning.getUser(session);
    await ContentCommunitying.assertUserIsOwner(communityName, user);
    const msg = await ContentCommunitying.deleteCommunity(communityName);
    return { msg: msg.msg };
  }
  //Community Users
  @Router.post("/communities/:communityName/users")
  async JoinCommunity(session: SessionDoc, communityName: string) {
    const user = Sessioning.getUser(session);
    const community = await ContentCommunitying.getCommunityByName(communityName);
    await Inviting.userHasInvite(user, community.community._id);
    await Inviting.deleteInvite(user, community.community._id);
    const msg = await Relationshipping.relate(community.community._id, user, "member");
    return { msg: msg.msg };
  }
  @Router.delete("/communities/:communityName/users")
  async LeaveCommunity(session: SessionDoc, communityName: string) {
    const user = Sessioning.getUser(session);
    const community = await ContentCommunitying.getCommunityByName(communityName);
    const msg = await Relationshipping.unrelate(community.community._id, user, "member");
    return { msg: msg.msg };
  }
  //Community Posts
  @Router.post("/communities/:communityName/posts")
  async postToCommunity(session: SessionDoc, communityName: string, post: ObjectId) {
    const thisPrivacyAttribute = "member";
    await helpers.checkCommunityPermission(session, communityName, thisPrivacyAttribute);
    const newPost = await ContentCommunitying.addPost(communityName, post);
    return { msg: newPost.msg };
  }
  @Router.get("/communities/:communityName/posts")
  async getCommunityPosts(session: SessionDoc, communityName: string) {
    const thisPrivacyAttribute = "member";
    await helpers.checkCommunityPermission(session, communityName, thisPrivacyAttribute);
    const msg = await ContentCommunitying.getCommunityPosts(communityName);
    return { msg: msg.msg, posts: msg.communityPosts };
  }
  @Router.delete("/communities/:communityName/posts")
  async deleteCommunityPost(session: SessionDoc, communityName: string, post: ObjectId) {
    try {
      const thisPrivacyAttribute = "member";
      await helpers.checkCommunityPermission(session, communityName, thisPrivacyAttribute);
    } catch {
      //Owner can also delete
      const user = Sessioning.getUser(session);
      await ContentCommunitying.assertUserIsOwner(communityName, user);
    }
    const msg = await ContentCommunitying.deletePost(communityName, post);
    return { msg: msg.msg };
  }

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    try {
      await Posting.assertAuthorIsUser(oid, user);
    } catch {
      await Collaborating.assertColab(user, oid);
    }
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }
}

class Helpers {
  public async checkRelationPermission(session: SessionDoc, object_id: string, checkPrivacyAttribute: string) {
    const user = Sessioning.getUser(session);
    const post = await Posting.getPostByID(object_id);
    const poster = post.post.author;
    const relations = await Relationshipping.getRelationship(poster, user);
    const relationNames = relations.relations.map((x: RelationshipDoc) => x.relationName);
    await PrivacyControlling.assertAnyValueSatisfies(post.post._id, checkPrivacyAttribute, relationNames);
  }

  public async checkCommunityPermission(session: SessionDoc, communityName: string, checkPrivacyAttribute: string) {
    const user = Sessioning.getUser(session);
    const community = await ContentCommunitying.getCommunityByName(communityName);
    const relations = await Relationshipping.getRelationship(community.community._id, user);
    const relationNames = relations.relations.map((x: RelationshipDoc) => x.relationName);
    await PrivacyControlling.assertAnyValueSatisfies(community.community._id, checkPrivacyAttribute, relationNames);
  }
}

export const helpers = new Helpers();

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
