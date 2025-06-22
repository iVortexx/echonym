
import type { Timestamp } from "firebase/firestore"

export interface User {
  uid: string
  anonName: string
  xp: number
  createdAt: Timestamp | string
  recoveryId: string;
  activeAuthUid?: string; // The currently active Firebase Auth UID for this user
  postCount?: number
  commentCount?: number
  avatarUrl?: string
  avatarOptions?: Record<string, string>
  followersCount?: number
  followingCount?: number
  savedPosts?: string[]
  hiddenPosts?: string[]
}

export interface Post {
  id: string
  userId: string
  anonName: string
  title: string
  content: string
  tags?: string[]
  summary?: string
  createdAt: Timestamp | string
  upvotes: number
  downvotes: number
  commentCount: number
  xp: number
  avatarUrl?: string
  // For search results, not a stored field
  searchKeywords?: string[]
}

export interface Comment {
  id: string
  postId: string
  userId: string
  anonName: string
  content: string
  createdAt: Timestamp | string
  upvotes: number
  downvotes: number
  xp: number
  parentId?: string
  replies?: Comment[]
  avatarUrl?: string
}

export type VoteType = "up" | "down"

export interface Vote {
  userId: string
  postId?: string
  commentId?: string
  type: VoteType
}

export interface Chat {
  id: string; // Composite ID: sorted user UIDs
  users: string[]; // [userId1, userId2]
  userNames: { [key: string]: string };
  userAvatars: { [key: string]: string | undefined };
  lastMessage?: {
    text: string;
    senderId: string;
  };
  updatedAt: Timestamp | string;
  // For client-side use
  otherUser?: User;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | string;
}

export interface TypingStatus {
  isTyping: boolean;
  updatedAt: Timestamp | string;
}

export interface Notification {
  id: string;
  type: 'new_comment' | 'new_reply' | 'new_follower' | 'welcome' | 'new_message';
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  targetPostId?: string;
  targetCommentId?: string;
  chatId?: string;
  commentSnippet?: string;
  message?: string;
  read: boolean;
  createdAt: Timestamp | string;
}


// Mock Timestamp type for demo
export type { Timestamp }
