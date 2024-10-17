import AuthenticatingConcept from "./concepts/authenticating";
import CollaboratingConcept from "./concepts/collaborating";
import ContentCommunityingConcept from "./concepts/contentCommunitying";
import FriendingConcept from "./concepts/friending";
import InvitingConcept from "./concepts/inviting";
import PostingConcept from "./concepts/posting";
import PrivacyControllingConcept from "./concepts/privacyControlling";
import RelationshippingConcept from "./concepts/relationshipping";
import ReplyingConcept from "./concepts/replying";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Authing = new AuthenticatingConcept("users");
export const Collaborating = new CollaboratingConcept("collaborations");
export const ContentCommunitying = new ContentCommunityingConcept("contentCommunities");
//Friending
export const Inviting = new InvitingConcept("invites");
export const Posting = new PostingConcept("posts");
export const PrivacyControlling = new PrivacyControllingConcept("privacyControls");
export const Relationshipping = new RelationshippingConcept("relationships");
export const Replying = new ReplyingConcept("replies");
export const Sessioning = new SessioningConcept();

export const Friending = new FriendingConcept("friends");
