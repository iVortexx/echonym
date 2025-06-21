"use server"

import { z } from "zod"
import { db } from "./firebase"
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  increment,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore"
import { revalidatePath } from "next/cache"
import type { Post, VoteType, User } from "./types"
import { suggestTags } from "@/ai/flows/suggest-tags"
import { scorePost as scorePostFlow } from "@/ai/flows/score-post-flow"
import type { ScorePostInput, ScorePostOutput } from "@/ai/flows/score-post-flow"
import { summarizePost } from "@/ai/flows/summarize-post-flow"

const PostSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().min(1, "Content is required"),
  tag: z.string().optional(),
})

// The user's UID is passed from the client, as server actions don't have auth context.
export async function createPost(rawInput: unknown, userId: string) {
  if (!userId) {
    return { error: "You must be logged in to post." }
  }

  const validation = PostSchema.safeParse(rawInput)

  if (!validation.success) {
    return { error: validation.error.issues.map((i) => i.message).join(", ") }
  }

  const { title, content, tag } = validation.data

  let summary: string | undefined;
  if (content.length > 300) { // Only summarize longer posts
    try {
      const summaryResult = await summarizePost({ content });
      summary = summaryResult.summary;
    } catch (e) {
      console.error("Failed to generate summary:", e);
      // Don't block post creation if summary fails
      summary = undefined;
    }
  }

  const userDocRef = doc(db, "users", userId)

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef)
      if (!userDoc.exists()) {
        throw new Error("User document does not exist! Cannot create post.")
      }
      const userData = userDoc.data() as User
      const newXp = userData.xp + 10

      transaction.update(userDocRef, { xp: newXp, postCount: increment(1) })

      const postCollectionRef = collection(db, "posts")
      const newPostRef = doc(postCollectionRef)

      const postPayload: any = {
        userId: userId,
        title,
        content,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        anonName: userData.anonName,
        xp: userData.xp,
      }

      if (tag) {
        postPayload.tag = tag
      }

      if (summary) {
        postPayload.summary = summary
      }

      transaction.set(newPostRef, postPayload)
    })

    revalidatePath("/")
    return { success: true }
  } catch (e: any) {
    console.error("Error creating post:", e)
    if (e.code === "permission-denied" || e.code === 'PERMISSION_DENIED') {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console to allow writes.",
      }
    }
    return { error: e.message || "Failed to create post." }
  }
}

const CommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  postId: z.string(),
  parentId: z.string().optional(),
})

export async function createComment(rawInput: unknown, userId: string) {
  if (!userId) {
    return { error: "You must be logged in to comment." }
  }

  const validation = CommentSchema.safeParse(rawInput)

  if (!validation.success) {
    return { error: "Invalid comment data." }
  }

  const { content, postId, parentId } = validation.data

  const userDocRef = doc(db, "users", userId)
  const postDocRef = doc(db, "posts", postId)

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef)
      const postDoc = await transaction.get(postDocRef)

      if (!userDoc.exists() || !postDoc.exists()) {
        throw new Error("User or Post document does not exist!")
      }

      const userData = userDoc.data() as User
      const postData = postDoc.data() as Post

      const newXp = userData.xp + 5
      transaction.update(userDocRef, { xp: newXp, commentCount: increment(1) })

      const newCommentCount = (postData.commentCount || 0) + 1
      transaction.update(postDocRef, { commentCount: newCommentCount })

      const commentCollectionRef = collection(db, `posts/${postId}/comments`)
      const commentData: any = {
        postId,
        userId: userId,
        anonName: userData.anonName,
        xp: userData.xp,
        content,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
      }

      if (parentId) {
        commentData.parentId = parentId
      }

      transaction.set(doc(commentCollectionRef), commentData)
    })

    revalidatePath(`/post/${postId}`)
    return { success: true }
  } catch (e: any) {
    console.error("Error creating comment:", e)
    if (e.code === "permission-denied" || e.code === 'PERMISSION_DENIED') {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console to allow writes.",
      }
    }
    return { error: e.message || "Failed to create comment." }
  }
}

export async function handleVote(
  userId: string,
  itemId: string,
  itemType: "post" | "comment",
  voteType: VoteType,
  postId?: string
) {
  if (!userId) return { error: "Not authenticated" }
  if (itemType === "comment" && !postId) return { error: "Post ID is missing" }

  const itemRef =
    itemType === "post"
      ? doc(db, "posts", itemId)
      : doc(db, `posts/${postId}/comments/${itemId}`)

  const voteId = `${userId}_${itemType}_${itemId}`
  const voteRef = doc(db, "votes", voteId)

  try {
    await runTransaction(db, async (transaction) => {
      const [itemSnap, voteSnap] = await Promise.all([
        transaction.get(itemRef),
        transaction.get(voteRef),
      ])

      if (!itemSnap.exists()) throw new Error("Item not found")

      const itemData = itemSnap.data()
      const postAuthorId = itemData.userId
      const postAuthorRef = doc(db, "users", postAuthorId)
      
      let upvoteChange = 0
      let downvoteChange = 0
      let xpChange = 0

      if (voteSnap.exists()) {
        const vote = voteSnap.data()
        if (vote.type === voteType) {
          // User is toggling their vote off
          transaction.delete(voteRef)
          voteType === "up" ? ((upvoteChange = -1), (xpChange = -2)) : (downvoteChange = -1)
        } else {
          // User is changing their vote
          transaction.update(voteRef, { type: voteType })
          if (voteType === "up") {
            upvoteChange = 1
            downvoteChange = -1
            xpChange = 2
          } else {
            upvoteChange = -1
            downvoteChange = 1
            xpChange = -2
          }
        }
      } else {
        // User is casting a new vote
        transaction.set(voteRef, {
          userId,
          type: voteType,
          [itemType === "post" ? "postId" : "commentId"]: itemId,
        })
        voteType === "up" ? ((upvoteChange = 1), (xpChange = 2)) : (downvoteChange = 1)
      }

      transaction.update(itemRef, {
        upvotes: (itemData.upvotes || 0) + upvoteChange,
        downvotes: (itemData.downvotes || 0) + downvoteChange,
      })
      
      // Only update author's XP if it's not their own post and the author exists
      if (userId !== postAuthorId) {
        const authorSnap = await transaction.get(postAuthorRef)
        if (authorSnap.exists()) {
            transaction.update(postAuthorRef, { 
                xp: increment(xpChange),
                totalUpvotes: increment(upvoteChange),
                totalDownvotes: increment(downvoteChange)
            })
        }
      }
    })

    // Revalidate paths to update UI across the app
    revalidatePath(`/`)
    revalidatePath(itemType === "comment" && postId ? `/post/${postId}` : `/post/${itemId}`)
    
    return { success: true }
  } catch (e: any) {
    console.error("Vote transaction failed:", e)
    if (e.code === "permission-denied" || e.code === 'PERMISSION_DENIED') {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console.",
      }
    }
    return { error: e.message || "Failed to process vote." }
  }
}

export async function getTagSuggestions(content: string) {
  if (!content.trim()) {
    return { tags: [] }
  }
  try {
    const result = await suggestTags({ content })
    return { tags: result.tags || [] }
  } catch (error: any) {
    console.error("Error fetching tag suggestions:", error)
    // Don't show an error to the user, just return no tags.
    // This can happen if the GEMINI_API_KEY is not set.
    return { tags: [] }
  }
}

export async function scorePost(input: ScorePostInput): Promise<ScorePostOutput> {
  if (!input.title.trim() || !input.content.trim()) {
    return { score: 0, clarity: "Please provide a title and content.", safety: "N/A" }
  }
  try {
    const result = await scorePostFlow(input)
    return result
  } catch (error: any) {
    console.error("Error fetching post score:", error)
    return { score: 0, clarity: "Could not analyze post.", safety: "Error during analysis."}
  }
}

export async function searchUsers(nameQuery: string): Promise<User[]> {
  if (!nameQuery) return []
  try {
    const usersRef = collection(db, "users")
    const q = query(
      usersRef,
      where("anonName", ">=", nameQuery),
      where("anonName", "<=", nameQuery + "\uf8ff"),
      limit(10)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as User)
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

export async function getUserByAnonName(anonName: string): Promise<User | null> {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("anonName", "==", anonName), limit(1))
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      return null
    }
    return querySnapshot.docs[0].data() as User
  } catch (error) {
    console.error("Error getting user by anon name:", error)
    return null
  }
}

export async function getPostsByUserId(userId: string): Promise<Post[]> {
  try {
    const postsRef = collection(db, "posts")
    const q = query(postsRef, where("userId", "==", userId), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post))
  } catch (error) {
    console.error("Error getting posts by user ID:", error)
    return []
  }
}
