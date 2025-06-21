"use server";

import { z } from "zod";
import { db } from "./firebase";
import {
  collection,
  doc,
  runTransaction,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { Post, VoteType, User } from "./types";
import { suggestTags } from "@/ai/flows/suggest-tags";

const PostSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().min(1, "Content is required"),
  tag: z.string().optional(),
});

// The user's UID is passed from the client, as server actions don't have auth context.
export async function createPost(rawInput: unknown, userId: string) {
  if (!userId) {
    return { error: "You must be logged in to post." };
  }

  const validation = PostSchema.safeParse(rawInput);

  if (!validation.success) {
    return { error: validation.error.issues.map((i) => i.message).join(", ") };
  }

  const { title, content, tag } = validation.data;

  const userDocRef = doc(db, "users", userId);

  try {
    const postPayload: any = {
      userId: userId,
      title,
      content,
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
    };

    if (tag) {
      postPayload.tag = tag;
    }

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document does not exist! Cannot create post.");
      }
      const userData = userDoc.data() as User;
      const newXp = userData.xp + 10;

      transaction.update(userDocRef, { xp: newXp });

      const postCollectionRef = collection(db, "posts");
      transaction.set(doc(postCollectionRef), {
        ...postPayload,
        anonName: userData.anonName,
        xp: userData.xp,
      });
    });

    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    console.error("Error creating post:", e);
    if (e.code === "permission-denied") {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console to allow writes.",
      };
    }
    return { error: e.message || "Failed to create post." };
  }
}

const CommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  postId: z.string(),
});

export async function createComment(rawInput: unknown, userId: string) {
  if (!userId) {
    return { error: "You must be logged in to comment." };
  }

  const validation = CommentSchema.safeParse(rawInput);

  if (!validation.success) {
    return { error: "Invalid comment data." };
  }

  const { content, postId } = validation.data;

  const userDocRef = doc(db, "users", userId);
  const postDocRef = doc(db, "posts", postId);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      const postDoc = await transaction.get(postDocRef);

      if (!userDoc.exists() || !postDoc.exists()) {
        throw new Error("User or Post document does not exist!");
      }

      const userData = userDoc.data() as User;
      const postData = postDoc.data() as Post;

      const newXp = userData.xp + 5;
      transaction.update(userDocRef, { xp: newXp });

      const newCommentCount = (postData.commentCount || 0) + 1;
      transaction.update(postDocRef, { commentCount: newCommentCount });

      const commentCollectionRef = collection(db, `posts/${postId}/comments`);
      const commentData = {
        postId,
        userId: userId,
        anonName: userData.anonName,
        xp: userData.xp,
        content,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
      };
      transaction.set(doc(commentCollectionRef), commentData);
    });

    revalidatePath(`/post/${postId}`);
    return { success: true };
  } catch (e: any) {
    console.error("Error creating comment:", e);
    if (e.code === "permission-denied") {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console to allow writes.",
      };
    }
    return { error: e.message || "Failed to create comment." };
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
  if (itemType === "comment" && !postId) return { error: "Post ID is missing" };

  const itemRef =
    itemType === "post"
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
      const postAuthorId = itemData.userId;
      const postAuthorRef = doc(db, "users", postAuthorId);
      const authorSnap = await transaction.get(postAuthorRef);

      let upvoteChange = 0;
      let downvoteChange = 0;
      let xpChange = 0;

      if (voteSnap.exists()) {
        const vote = voteSnap.data();
        if (vote.type === voteType) {
          transaction.delete(voteRef);
          voteType === "up" ? (upvoteChange = -1, xpChange = -2) : (downvoteChange = -1);
        } else {
          transaction.update(voteRef, { type: voteType });
          if (voteType === "up") {
            upvoteChange = 1;
            downvoteChange = -1;
            xpChange = 2;
          } else {
            upvoteChange = -1;
            downvoteChange = 1;
            xpChange = -2;
          }
        }
      } else {
        transaction.set(voteRef, {
          userId,
          type: voteType,
          [itemType === "post" ? "postId" : "commentId"]: itemId,
        });
        voteType === "up" ? (upvoteChange = 1, xpChange = 2) : (downvoteChange = 1);
      }

      transaction.update(itemRef, {
        upvotes: (itemData.upvotes || 0) + upvoteChange,
        downvotes: (itemData.downvotes || 0) + downvoteChange,
      });

      if (xpChange !== 0 && userId !== postAuthorId && authorSnap.exists()) {
        const authorData = authorSnap.data();
        const newXp = (authorData.xp || 0) + xpChange;
        transaction.update(postAuthorRef, { xp: newXp });
      }
    });

    revalidatePath(itemType === "comment" && postId ? `/post/${postId}` : `/post/${itemId}`);
    revalidatePath(`/`);

    return { success: true };
  } catch (e: any) {
    console.error("Vote transaction failed:", e);
    if (e.code === "permission-denied") {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console.",
      };
    }
    return { error: e.message || "Failed to process vote." };
  }
}


export async function getTagSuggestions(content: string) {
  if (!content.trim()) {
    return { tags: [] };
  }
  try {
    const result = await suggestTags({ content });
    return { tags: result.tags };
  } catch (error: any) {
    console.error("Error fetching tag suggestions:", error);
    // Don't show an error to the user if the key is just missing.
    if (error.status === "FAILED_PRECONDITION") {
      return { tags: [] };
    }
    return { tags: [] };
  }
}
