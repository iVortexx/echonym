import type { Timestamp } from "firebase/firestore"

export interface User {
  uid: string
  anonName: string
  xp: number
  createdAt: Timestamp | string
  postCount?: number
  commentCount?: number
  totalUpvotes?: number
  totalDownvotes?: number
  avatarUrl?: string
  avatarOptions?: Record<string, string>
}

export interface Post {
  id: string
  userId: string
  anonName: string
  title: string
  content: string
  tag?: string
  summary?: string
  createdAt: Timestamp | string
  upvotes: number
  downvotes: number
  commentCount: number
  xp: number
  avatarUrl?: string
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

// Mock Timestamp type for demo
export type { Timestamp }
