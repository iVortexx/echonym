
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
  getDoc,
  limit,
  orderBy,
  Timestamp,
  updateDoc,
} from "firebase/firestore"
import { revalidatePath } from "next/cache"
import type { Post, VoteType, User, Vote } from "./types"
import { suggestTags } from "@/ai/flows/suggest-tags"
import { scorePost as scorePostFlow } from "@/ai/flows/score-post-flow"
import type { ScorePostInput, ScorePostOutput } from "@/ai/flows/score-post-flow"
import { summarizePost } from "@/ai/flows/summarize-post-flow"
import { buildAvatarUrl } from "./utils"

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
        avatarUrl: userData.avatarUrl,
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
        avatarUrl: userData.avatarUrl,
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
  if (!userId) return { error: "Not authenticated" };
  if (itemType === "comment" && !postId) return { error: "Post ID is missing for comment vote" };

  const itemRef = itemType === "post"
      ? doc(db, "posts", itemId)
      : doc(db, `posts/${postId}/comments/${itemId}`);
  
  const voteId = `${userId}_${itemType}_${itemId}`;
  const voteRef = doc(db, "votes", voteId);

  try {
    await runTransaction(db, async (transaction) => {
      const [itemSnap, voteSnap] = await Promise.all([
        transaction.get(itemRef),
        transaction.get(voteRef),
      ]);

      if (!itemSnap.exists()) throw new Error("Item not found");

      const itemData = itemSnap.data();
      const authorId = itemData.userId;
      if (!authorId) throw new Error("Item author not found.");
      
      const currentVote = voteSnap.data()?.type as VoteType | undefined;
      let upvotes_inc = 0;
      let downvotes_inc = 0;

      // Case 1: Toggling the same vote off
      if (currentVote === voteType) {
        transaction.delete(voteRef);
        if (voteType === 'up') {
          upvotes_inc = -1;
        } else { // 'down'
          downvotes_inc = -1;
        }
      }
      // Case 2: Changing vote (e.g., from up to down)
      else if (currentVote) {
        transaction.update(voteRef, { type: voteType });
        if (voteType === 'up') { // from down to up
          upvotes_inc = 1;
          downvotes_inc = -1;
        } else { // from up to down
          upvotes_inc = -1;
          downvotes_inc = 1;
        }
      }
      // Case 3: New vote
      else {
        const votePayload: Vote = { userId, type: voteType };
        if (itemType === 'post') votePayload.postId = itemId;
        else votePayload.commentId = itemId;
        transaction.set(voteRef, votePayload);

        if (voteType === 'up') {
          upvotes_inc = 1;
        } else { // 'down'
          downvotes_inc = 1;
        }
      }
      
      // Update the item's (post or comment) vote counts
      transaction.update(itemRef, {
        upvotes: increment(upvotes_inc),
        downvotes: increment(downvotes_inc),
      });

    });

    revalidatePath(`/`);
    revalidatePath(itemType === "comment" && postId ? `/post/${postId}` : `/post/${itemId}`);
    revalidatePath('/profile', 'layout');
    
    return { success: true };
  } catch (e: any) {
    console.error("Vote transaction failed:", e);
    return { error: e.message || "Failed to process vote." };
  }
}

export async function getUserVotes(
  userId: string,
  itemIds: string[],
  itemType: "post" | "comment"
): Promise<Record<string, VoteType>> {
  if (!userId || itemIds.length === 0) return {};
  try {
    const votesRef = collection(db, "votes");
    const fieldPath = itemType === "post" ? "postId" : "commentId";
    
    // Firestore 'in' query is limited to 30 items, so we must chunk the requests.
    const chunks = [];
    for (let i = 0; i < itemIds.length; i += 30) {
        chunks.push(itemIds.slice(i, i + 30));
    }
    
    const userVotes: Record<string, VoteType> = {};

    for (const chunk of chunks) {
        const q = query(
          votesRef,
          where("userId", "==", userId),
          where(fieldPath, "in", chunk)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const vote = doc.data() as Vote;
          const itemId = itemType === "post" ? vote.postId! : vote.commentId!;
          userVotes[itemId] = vote.type;
        });
    }

    return userVotes;
  } catch (error) {
    console.error("Error fetching user votes:", error);
    return {};
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
    return querySnapshot.docs.map((doc) => {
        const user = doc.data() as User;
        return {
          ...user,
          createdAt: user.createdAt && typeof (user.createdAt as any).toDate === 'function'
            ? (user.createdAt as Timestamp).toDate().toISOString()
            : (user.createdAt as string),
        } as User;
      });
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
    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data() as User;
    return {
      uid: userDoc.id,
      ...user,
      createdAt: user.createdAt && typeof (user.createdAt as any).toDate === 'function'
        ? (user.createdAt as Timestamp).toDate().toISOString()
        : (user.createdAt as string),
    } as User;
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
    return querySnapshot.docs.map((doc) => {
        const post = { id: doc.id, ...doc.data() } as Post;
        return {
          ...post,
          createdAt: post.createdAt && typeof (post.createdAt as any).toDate === 'function'
            ? (post.createdAt as Timestamp).toDate().toISOString()
            : (post.createdAt as string),
        };
      }) as Post[];
  } catch (error) {
    console.error("Error getting posts by user ID:", error)
    return []
  }
}


export async function updateUserAvatar(userId: string, options: Record<string, string>, newUrl: string) {
  if (!userId) {
    return { error: "User not authenticated." }
  }

  try {
    const userDocRef = doc(db, "users", userId)
    await updateDoc(userDocRef, {
      avatarOptions: options,
      avatarUrl: newUrl,
    })
    revalidatePath(`/profile/.*`, 'layout') // Revalidate all profile pages
    return { success: true }
  } catch (e: any) {
    console.error("Error updating avatar:", e)
    return { error: e.message || "Failed to update avatar." }
  }
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return false;
  }
  const followingRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
  const docSnap = await getDoc(followingRef);
  return docSnap.exists();
}

export async function toggleFollowUser(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) {
    return { error: "You cannot follow yourself." };
  }

  const currentUserRef = doc(db, "users", currentUserId);
  const targetUserRef = doc(db, "users", targetUserId);

  const followingRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
  const followerRef = doc(db, `users/${targetUserId}/followers/${currentUserId}`);

  try {
    const targetDoc = await getDoc(targetUserRef);
    if (!targetDoc.exists()) {
      return { error: "Target user not found." };
    }
    const targetUserData = targetDoc.data() as User;

    let wasFollowing = false;
    await runTransaction(db, async (transaction) => {
      const followingDoc = await transaction.get(followingRef);
      wasFollowing = followingDoc.exists();

      if (wasFollowing) {
        // Unfollow
        transaction.delete(followingRef);
        transaction.delete(followerRef);
        transaction.update(currentUserRef, { followingCount: increment(-1) });
        transaction.update(targetUserRef, { followersCount: increment(-1) });
      } else {
        // Follow
        transaction.set(followingRef, { userId: targetUserId, createdAt: serverTimestamp() });
        transaction.set(followerRef, { userId: currentUserId, createdAt: serverTimestamp() });
        transaction.update(currentUserRef, { followingCount: increment(1) });
        transaction.update(targetUserRef, { followersCount: increment(1) });
      }
    });

    revalidatePath(`/profile/${encodeURIComponent(targetUserData.anonName)}`);
    revalidatePath(`/profile`);

    return { success: true, wasFollowing };
  } catch (e: any) {
    console.error("Follow/unfollow transaction failed:", e);
    return { error: e.message || "Failed to follow user." };
  }
}
