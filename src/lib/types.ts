
import type { Timestamp } from "firebase/firestore"

export interface User {
  uid: string
  anonName: string
  xp: number
  createdAt: Timestamp | string
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

export interface Notification {
  id: string;
  type: 'new_comment' | 'new_reply' | 'new_follower';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  targetPostId?: string;
  targetCommentId?: string;
  commentSnippet?: string;
  read: boolean;
  createdAt: Timestamp | string;
}


// Mock Timestamp type for demo
export type { Timestamp }
