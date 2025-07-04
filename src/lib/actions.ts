
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
  deleteDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  setDoc
} from "firebase/firestore"
import { revalidatePath } from "next/cache"
import type { Post, VoteType, User, Vote, Chat, ChatMessage, UserChat } from "./types"
import { buildAvatarUrl } from "./utils"

const PostSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).max(5, "You can add up to 5 tags.").optional(),
})

const generateKeywords = (title: string, content: string): string[] => {
    const text = `${title} ${content}`.toLowerCase();
    const words = text.split(/\s+/).map(word => word.replace(/[^a-z0-9]/g, ''));
    return Array.from(new Set(words.filter(word => word.length > 2)));
};


// The user's UID is passed from the client, as server actions don't have auth context.
export async function createPost(rawInput: unknown, userId: string) {
  if (!userId) {
    return { error: "You must be logged in to create an echo." }
  }

  const validation = PostSchema.safeParse(rawInput)

  if (!validation.success) {
    return { error: validation.error.issues.map((i) => i.message).join(", ") }
  }

  let { title, content, tags } = validation.data
  let aiWarning: string | undefined;

  let summary: string | undefined;
  if (process.env.GEMINI_API_KEY && content.length > 300) { // Only summarize longer posts
    try {
      const { summarizePost } = await import('@/ai/flows/summarize-post-flow');
      const summaryResult = await summarizePost({ content });
      summary = summaryResult.summary;
    } catch (e) {
      console.error("Failed to generate summary:", e);
      // Don't block post creation if summary fails
      summary = undefined;
    }
  }
  
  if (!tags || tags.length === 0) {
    if (process.env.GEMINI_API_KEY) {
        try {
          const { suggestTags } = await import('@/ai/flows/suggest-tags');
          const suggested = await suggestTags({ content });
          tags = suggested.tags;
        } catch (e) {
          console.error("Failed to generate tags:", e);
          aiWarning = "Echo created, but AI tag suggestion failed. Please add tags manually.";
        }
    }
    // If tags are still empty (either AI failed or no key), set a default.
    if (!tags || tags.length === 0) {
        tags = ['discussion'];
    }
  }

  const userDocRef = doc(db, "users", userId)

  try {
    const newPostId = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef)
      if (!userDoc.exists()) {
        throw new Error("User document does not exist! Cannot create post.")
      }
      const userData = userDoc.data() as User
      const newXp = userData.xp + 10

      transaction.update(userDocRef, { xp: newXp, postCount: increment(1) })

      const postCollectionRef = collection(db, "posts")
      const newPostRef = doc(postCollectionRef)

      const postKeywords = generateKeywords(title, content);
      const allKeywords = tags && tags.length > 0 ? Array.from(new Set([...postKeywords, ...tags])) : postKeywords;

      const postPayload: any = {
        userId: userId,
        title,
        content,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        anonName: userData.anonName,
        xp: newXp,
        avatarUrl: userData.avatarUrl,
        searchKeywords: allKeywords,
      }

      if (tags && tags.length > 0) {
        postPayload.tags = tags
      }

      if (summary) {
        postPayload.summary = summary
      }

      transaction.set(newPostRef, postPayload);
      return newPostRef.id;
    })

    revalidatePath("/")
    return { success: true, postId: newPostId, warning: aiWarning }
  } catch (e: any) {
    console.error("Error creating post:", e)
    if (e.code === "permission-denied" || e.code === 'PERMISSION_DENIED') {
      return {
        error:
          "Firestore Security Rules are blocking the request. Please update your rules in the Firebase Console to allow writes.",
      }
    }
    return { error: e.message || "Failed to create echo." }
  }
}


export async function updatePost(postId: string, rawInput: unknown, userId: string) {
    if (!userId) return { error: "You must be logged in to edit." };

    const validation = PostSchema.safeParse(rawInput);
    if (!validation.success) return { error: "Invalid data." };

    let { title, content, tags } = validation.data;
    let aiWarning: string | undefined;
    const postRef = doc(db, "posts", postId);

    try {
        const postDoc = await getDoc(postRef);
        if (!postDoc.exists() || postDoc.data().userId !== userId) {
            return { error: "Echo not found or you do not have permission to edit it." };
        }

        if (!tags || tags.length === 0) {
            if (process.env.GEMINI_API_KEY) {
                try {
                    const { suggestTags } = await import('@/ai/flows/suggest-tags');
                    const suggested = await suggestTags({ content });
                    tags = suggested.tags;
                } catch (e) {
                    console.error("Failed to generate tags for update:", e);
                    aiWarning = "Echo updated, but AI tag suggestion failed. Please add tags manually.";
                }
            }
            if (!tags || tags.length === 0) {
                tags = ['discussion'];
            }
        }
        
        const postKeywords = generateKeywords(title, content);
        const allKeywords = tags && tags.length > 0 ? Array.from(new Set([...postKeywords, ...tags])) : postKeywords;


        await updateDoc(postRef, {
            title,
            content,
            tags: tags || [],
            searchKeywords: allKeywords,
        });

        revalidatePath(`/`);
        revalidatePath(`/post/${postId}`);
        return { success: true, postId, warning: aiWarning };
    } catch (e: any) {
        console.error("Error updating post:", e);
        return { error: "Failed to update echo." };
    }
}

export async function deletePost(postId: string, userId: string) {
    if (!userId) return { error: "Authentication required." };
    const postRef = doc(db, "posts", postId);
    const userRef = doc(db, "users", userId);

    try {
        await runTransaction(db, async (transaction) => {
            const [postDoc, userDoc] = await Promise.all([
                transaction.get(postRef),
                transaction.get(userRef)
            ]);
            
            if (!postDoc.exists() || postDoc.data().userId !== userId) {
                throw new Error("Echo not found or permission denied.");
            }
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }

            const currentPostCount = userDoc.data().postCount || 0;
            const newPostCount = Math.max(0, currentPostCount - 1);

            transaction.delete(postRef);
            transaction.update(userRef, { postCount: newPostCount });
            // Note: Deleting subcollections (comments, votes) should be handled by a Cloud Function for production apps.
        });
        
        revalidatePath(`/`);
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting post:", e);
        return { error: e.message || "Failed to delete echo." };
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
  const parentCommentRef = parentId ? doc(db, `posts/${postId}/comments/${parentId}`) : null

  try {
    await runTransaction(db, async (transaction) => {
      // --- ALL READS FIRST ---
      const userDoc = await transaction.get(userDocRef)
      const postDoc = await transaction.get(postDocRef)
      const parentCommentDoc = parentCommentRef ? await transaction.get(parentCommentRef) : null

      if (!userDoc.exists() || !postDoc.exists()) {
        throw new Error("User or Post document does not exist!")
      }
      if (parentId && !parentCommentDoc?.exists()) {
        throw new Error("Parent comment does not exist!")
      }

      const userData = userDoc.data() as User
      const postData = postDoc.data() as Post
      
      // --- ALL WRITES SECOND ---
      
      const newXp = userData.xp + 5
      transaction.update(userDocRef, { xp: newXp, commentCount: increment(1) })

      const newCommentCount = (postData.commentCount || 0) + 1
      transaction.update(postDocRef, { commentCount: newCommentCount })

      const commentCollectionRef = collection(db, `posts/${postId}/comments`)
      const newCommentRef = doc(commentCollectionRef)
      
      const commentData: any = {
        postId,
        userId: userId,
        anonName: userData.anonName,
        xp: newXp,
        content,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        avatarUrl: userData.avatarUrl,
      }
      if (parentId) {
        commentData.parentId = parentId
      }
      transaction.set(newCommentRef, commentData);

      // --- Notification Logic (using data from reads at the top) ---
      if (parentId && parentCommentDoc?.exists()) {
        const parentCommentData = parentCommentDoc.data();
        if (parentCommentData.userId !== userId) { // Do not notify if replying to your own comment
          const notificationRef = doc(collection(db, `users/${parentCommentData.userId}/notifications`));
          transaction.set(notificationRef, {
            type: 'new_reply',
            fromUserId: userId,
            fromUserName: userData.anonName,
            fromUserAvatar: userData.avatarUrl,
            targetPostId: postId,
            targetCommentId: parentId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } else if (!parentId) {
        if (postData.userId !== userId) { // Do not notify if commenting on your own post
           const notificationRef = doc(collection(db, `users/${postData.userId}/notifications`));
           transaction.set(notificationRef, {
              type: 'new_comment',
              fromUserId: userId,
              fromUserName: userData.anonName,
              fromUserAvatar: userData.avatarUrl,
              targetPostId: postId,
              commentSnippet: content.substring(0, 50),
              read: false,
              createdAt: serverTimestamp(),
            });
        }
      }
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
  voteType: "up" | "down",
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
      // --- ALL READS FIRST ---
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists()) throw new Error("Item not found");
      
      const itemData = itemSnap.data();
      const authorId = itemData.userId;

      const [voteSnap, authorSnap] = await Promise.all([
        transaction.get(voteRef),
        authorId !== userId ? transaction.get(doc(db, "users", authorId)) : Promise.resolve(null),
      ]);

      if (authorId !== userId && !authorSnap?.exists()) {
          throw new Error("Author not found");
      }
      
      // --- ALL WRITES SECOND ---
      const currentVote = voteSnap.data()?.type as VoteType | undefined;
      let upvotes_inc = 0;
      let downvotes_inc = 0;

      // Case 1: Toggling the same vote off
      if (currentVote === voteType) {
        transaction.delete(voteRef);
        if (voteType === 'up') upvotes_inc = -1;
        else downvotes_inc = -1;
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

        if (voteType === 'up') upvotes_inc = 1;
        else downvotes_inc = 1;
      }
      
      // Update the item's (post or comment) vote counts
      transaction.update(itemRef, {
        upvotes: increment(upvotes_inc),
        downvotes: increment(downvotes_inc),
      });

      // Update author's XP if the voter is not the author
      if (authorSnap) {
        const xp_change = upvotes_inc - downvotes_inc;
        transaction.update(authorSnap.ref, { xp: increment(xp_change) });
      }
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
  if (!content.trim() || !process.env.GEMINI_API_KEY) {
    return { tags: [] }
  }
  try {
    const { suggestTags } = await import('@/ai/flows/suggest-tags');
    const result = await suggestTags({ content })
    return { tags: result.tags || [] }
  } catch (error: any) {
    console.error("Error fetching tag suggestions:", error)
    // Don't show an error to the user, just return no tags.
    return { tags: [] }
  }
}

export async function scorePost(input: { title: string; content: string; }) {
  if (!input.title.trim() || !input.content.trim() || !process.env.GEMINI_API_KEY) {
    return { score: 0, clarity: "AI analysis unavailable.", safety: "AI analysis unavailable." }
  }
  try {
    const { scorePost } = await import('@/ai/flows/score-post-flow');
    const result = await scorePost(input)
    return result
  } catch (error: any) {
    console.error("Error fetching post score:", error)
    return { score: 0, clarity: "Could not analyze echo.", safety: "Error during analysis."}
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

export async function findUserByRecoveryId(recoveryId: string): Promise<{user: User, isNewLink: boolean} | null> {
  if (!recoveryId) return null;
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("recoveryId", "==", recoveryId), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const userDoc = querySnapshot.docs[0];
    const user = { uid: userDoc.id, ...userDoc.data() } as User;
     return {
      user: {
        ...user,
        createdAt: user.createdAt && typeof (user.createdAt as any).toDate === 'function'
            ? (user.createdAt as Timestamp).toDate().toISOString()
            : (user.createdAt as string),
      },
      isNewLink: true, // This logic is now handled in linkNewAuthSession
    };
  } catch (error) {
    console.error("Error finding user by recovery ID:", error);
    return null;
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
        const currentUserData = (await transaction.get(currentUserRef)).data() as User;

        transaction.set(followingRef, { userId: targetUserId, createdAt: serverTimestamp() });
        transaction.set(followerRef, { userId: currentUserId, createdAt: serverTimestamp() });
        transaction.update(currentUserRef, { followingCount: increment(1) });
        transaction.update(targetUserRef, { followersCount: increment(1) });
        
        // --- Notification Logic ---
        const notificationRef = doc(collection(db, `users/${targetUserId}/notifications`));
        transaction.set(notificationRef, {
            type: 'new_follower',
            fromUserId: currentUserId,
            fromUserName: currentUserData.anonName,
            fromUserAvatar: currentUserData.avatarUrl,
            read: false,
            createdAt: serverTimestamp(),
        });
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

export async function toggleUserPostList(userId: string, postId: string, list: 'savedPosts' | 'hiddenPosts') {
    if (!userId) return { error: "Authentication required." };
    const userRef = doc(db, "users", userId);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return { error: "User not found." };
        
        const userData = userDoc.data() as User;
        const currentList = userData[list] || [];
        const isPostInList = currentList.includes(postId);
        
        const updatePayload = {
            [list]: isPostInList ? arrayRemove(postId) : arrayUnion(postId)
        };

        await updateDoc(userRef, updatePayload);
        
        revalidatePath('/');
        if (list === 'savedPosts') revalidatePath('/saved');
        if (list === 'hiddenPosts') revalidatePath('/hidden');

        return { success: true, wasInList: isPostInList };
    } catch (e: any) {
        console.error(`Error toggling post in ${list}:`, e);
        return { error: `Failed to update ${list}.` };
    }
}


export async function getPostsByIds(postIds: string[]): Promise<Post[]> {
    if (postIds.length === 0) return [];
    
    // Firestore 'in' query has a limit of 30
    const chunks: string[][] = [];
    for (let i = 0; i < postIds.length; i += 30) {
        chunks.push(postIds.slice(i, i + 30));
    }
    
    try {
        const postPromises = chunks.map(chunk => {
            const postsRef = collection(db, "posts");
            const q = query(postsRef, where("__name__", "in", chunk));
            return getDocs(q);
        });
        
        const snapshotResults = await Promise.all(postPromises);
        const posts: Post[] = [];
        
        snapshotResults.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                 const post = { id: doc.id, ...doc.data() } as Post;
                 posts.push({
                   ...post,
                   createdAt: post.createdAt && typeof (post.createdAt as any).toDate === 'function'
                     ? (post.createdAt as Timestamp).toDate().toISOString()
                     : (post.createdAt as string),
                 });
            });
        });
        
        return posts;
    } catch (e) {
        console.error("Error fetching posts by IDs:", e);
        return [];
    }
}

export async function getSavedPostsForUser(userId: string, searchQuery?: string) {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return [];
    }
    const userData = userSnap.data() as User;
    const savedPostIds = userData.savedPosts || [];
    
    if (savedPostIds.length === 0) {
        return [];
    }

    let posts = await getPostsByIds(savedPostIds);

    if (searchQuery) {
        const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        if (searchWords.length > 0) {
            posts = posts.filter(post => 
                post.searchKeywords && searchWords.every(word => post.searchKeywords.includes(word))
            );
        }
    }

    return posts;
}

export async function getHiddenPostsForUser(userId: string, searchQuery?: string) {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return [];
    }
    const userData = userSnap.data() as User;
    const hiddenPostIds = userData.hiddenPosts || [];

    if (hiddenPostIds.length === 0) {
        return [];
    }

    let posts = await getPostsByIds(hiddenPostIds);
    
     if (searchQuery) {
        const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        if (searchWords.length > 0) {
            posts = posts.filter(post => 
                post.searchKeywords && searchWords.every(word => post.searchKeywords.includes(word))
            );
        }
    }

    return posts;
}


export async function getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
    }
    
    try {
        const userPromises = chunks.map(chunk => {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("__name__", "in", chunk));
            return getDocs(q);
        });
        
        const snapshotResults = await Promise.all(userPromises);
        const users: User[] = [];
        
        snapshotResults.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                 const user = { uid: doc.id, ...doc.data() } as User;
                 users.push({
                   ...user,
                   createdAt: user.createdAt && typeof (user.createdAt as any).toDate === 'function'
                     ? (user.createdAt as Timestamp).toDate().toISOString()
                     : (user.createdAt as string),
                 });
            });
        });
        
        return users;
    } catch (e) {
        console.error("Error fetching users by IDs:", e);
        return [];
    }
}

export async function getFollowers(userId: string): Promise<User[]> {
    if (!userId) return [];
    try {
        const followersRef = collection(db, `users/${userId}/followers`);
        const snapshot = await getDocs(followersRef);
        const followerIds = snapshot.docs.map(doc => doc.id);
        return await getUsersByIds(followerIds);
    } catch (e) {
        console.error("Error fetching followers:", e);
        return [];
    }
}

export async function getFollowing(userId: string): Promise<User[]> {
    if (!userId) return [];
    try {
        const followingRef = collection(db, `users/${userId}/following`);
        const snapshot = await getDocs(followingRef);
        const followingIds = snapshot.docs.map(doc => doc.id);
        return await getUsersByIds(followingIds);
    } catch (e) {
        console.error("Error fetching following:", e);
        return [];
    }
}


export async function markAllNotificationsAsRead(userId: string) {
  if (!userId) return { error: "Authentication required." };
  
  const notificationsRef = collection(db, `users/${userId}/notifications`);
  const q = query(notificationsRef, where("read", "==", false));

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: true, message: "No unread notifications." };
    }
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
    revalidatePath('/profile', 'layout'); // Revalidate to update bell
    return { success: true };
  } catch(e: any) {
    console.error("Error marking notifications as read:", e);
    return { error: "Failed to update notifications." };
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  if (!userId) return { error: "Authentication required." };
  
  const notificationRef = doc(db, `users/${userId}/notifications`, notificationId);
  
  try {
    await updateDoc(notificationRef, { read: true });
    // The onSnapshot listener in useNotifications will catch this and update the UI.
    // Revalidating is a good fallback and ensures the bell in the header updates.
    revalidatePath('/profile', 'layout'); 
    return { success: true };
  } catch(e: any) {
    console.error("Error marking notification as read:", e);
    return { error: "Failed to update notification." };
  }
}

export async function linkNewAuthSession(recoveryId: string, newAuthUid:string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!recoveryId || !newAuthUid) {
        return { success: false, error: "Missing recovery ID or new Auth UID." };
    }

    try {
        const usersRef = collection(db, "users");
        // Find the user document by its persistent recoveryId
        const userQuery = query(usersRef, where("recoveryId", "==", recoveryId), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            return { success: false, error: "No user found with that recovery ID." };
        }
        
        const persistentUserDocRef = userSnapshot.docs[0].ref;
        const persistentUserData = { uid: persistentUserDocRef.id, ...userSnapshot.docs[0].data() } as User;

        // If the user document is already linked to this auth UID, we don't need to do anything.
        if (persistentUserData.activeAuthUid === newAuthUid) {
             return { success: true, user: persistentUserData };
        }

        const batch = writeBatch(db);
        
        // Find and delete the temporary user profile that was created for the new auth session.
        const tempUserDocRef = doc(db, 'users', newAuthUid);
        batch.delete(tempUserDocRef);
        
        // Link the new auth session to the restored user document
        batch.update(persistentUserDocRef, { activeAuthUid: newAuthUid });
        
        await batch.commit();

        const updatedUserDoc = await getDoc(persistentUserDocRef);
        const user = { uid: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

        return { success: true, user };
    } catch (e: any) {
        console.error("Error linking new auth session:", e);
        return { success: false, error: "Failed to link new session." };
    }
}

export async function getTopUsers(): Promise<User[]> {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("xp", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const user = { uid: doc.id, ...doc.data() } as User;
      return {
        ...user,
        createdAt: user.createdAt && typeof (user.createdAt as any).toDate === 'function'
          ? (user.createdAt as Timestamp).toDate().toISOString()
          : (user.createdAt as string),
      };
    });
  } catch (error) {
    console.error("Error fetching top users:", error);
    return [];
  }
}

// CHAT ACTIONS

export async function getOrCreateChat(currentUserId: string, targetUserId: string): Promise<{ chatId: string; error?: undefined } | { error: string; chatId?: undefined }> {
    if (currentUserId === targetUserId) {
        return { error: "Cannot create chat with yourself." };
    }

    const chatId = [currentUserId, targetUserId].sort().join('_');
    const chatRef = doc(db, "chats", chatId);

    try {
        await runTransaction(db, async (transaction) => {
            const chatDoc = await transaction.get(chatRef);
            if (!chatDoc.exists()) {
                const [currentUserSnap, targetUserSnap] = await Promise.all([
                    transaction.get(doc(db, "users", currentUserId)),
                    transaction.get(doc(db, "users", targetUserId)),
                ]);

                if (!currentUserSnap.exists() || !targetUserSnap.exists()) {
                    throw new Error("One or both users not found.");
                }

                const currentUser = currentUserSnap.data() as User;
                const targetUser = targetUserSnap.data() as User;

                const newChat: Chat = {
                    id: chatId,
                    users: [currentUserId, targetUserId],
                    userNames: {
                        [currentUserId]: currentUser.anonName,
                        [targetUserId]: targetUser.anonName
                    },
                    userAvatars: {
                         [currentUserId]: currentUser.avatarUrl,
                         [targetUserId]: targetUser.avatarUrl
                    },
                    updatedAt: serverTimestamp(),
                };
                transaction.set(chatRef, newChat);

                const senderChatRef = doc(db, `users/${currentUserId}/chats/${chatId}`);
                transaction.set(senderChatRef, {
                    id: chatId,
                    withUserId: targetUserId,
                    withUserName: targetUser.anonName,
                    withUserAvatar: targetUser.avatarUrl,
                    unreadCount: 0,
                    updatedAt: serverTimestamp(),
                });

                const receiverChatRef = doc(db, `users/${targetUserId}/chats/${chatId}`);
                transaction.set(receiverChatRef, {
                    id: chatId,
                    withUserId: currentUserId,
                    withUserName: currentUser.anonName,
                    withUserAvatar: currentUser.avatarUrl,
                    unreadCount: 0,
                    updatedAt: serverTimestamp(),
                });
            }
        });
        return { chatId };
    } catch (e: any) {
        console.error("Error getting or creating chat:", e);
        return { error: e.message || "Failed to start chat." };
    }
}

export async function sendMessage(chatId: string, senderId: string, text: string, replyTo?: ChatMessage['replyTo'], tempId?: string): Promise<{ success: boolean; error?: string, messageId?: string }> {
    if (!text.trim()) {
        return { success: false, error: "Message cannot be empty." };
    }

    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(chatRef, "messages");
    const newMessageRef = doc(messagesRef);

    try {
        const batch = writeBatch(db);

        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) throw new Error("Chat not found.");
        const chatData = chatSnap.data() as Chat;

        const senderSnap = await getDoc(doc(db, "users", senderId));
        if (!senderSnap.exists()) throw new Error("Sender not found.");
        
        const receiverId = chatData.users.find(uid => uid !== senderId);
        if (!receiverId) throw new Error("Could not determine receiver.");

        const message: Partial<ChatMessage> = {
            chatId,
            senderId,
            text,
        };
        
        if (replyTo) {
            message.replyTo = {
                messageId: replyTo.messageId,
                text: replyTo.text,
                senderName: chatData.userNames[senderId] || "User"
            };
        }

        if (tempId) {
            message.tempId = tempId;
        }

        batch.set(newMessageRef, {
            ...message,
            createdAt: serverTimestamp()
        });
        
        const messageData = { text, senderId, createdAt: serverTimestamp() };
        batch.set(chatRef, { lastMessage: messageData, updatedAt: serverTimestamp() }, { merge: true });

        const senderChatRef = doc(db, `users/${senderId}/chats/${chatId}`);
        batch.set(senderChatRef, { lastMessage: messageData, updatedAt: serverTimestamp() }, { merge: true });

        const receiverChatRef = doc(db, `users/${receiverId}/chats/${chatId}`);
        batch.set(receiverChatRef, {
            lastMessage: messageData,
            unreadCount: increment(1),
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        await batch.commit();

        return { success: true, messageId: newMessageRef.id };
    } catch (e: any) {
        console.error("Error sending message:", e);
        return { success: false, error: e.message || "Failed to send message." };
    }
}

export async function setTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    if (!chatId || !userId) return;
    try {
        const typingRef = doc(db, `chats/${chatId}/typing/${userId}`);
        await setDoc(typingRef, {
            isTyping,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error setting typing status:", e);
    }
}

export async function clearChatUnread(userId: string, chatId: string) {
    if (!userId || !chatId) return;
    try {
        const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
        const docSnap = await getDoc(chatRef);
        if (docSnap.exists() && docSnap.data().unreadCount > 0) {
            await updateDoc(chatRef, { unreadCount: 0 });
        }
    } catch (e) {
        console.error("Error clearing chat unread count:", e);
    }
}

export async function toggleMessageReaction(chatId: string, messageId: string, emoji: string, userId: string) {
  if (!chatId || !messageId || !emoji || !userId) {
    return { error: 'Missing required fields.' };
  }

  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);

  try {
    await runTransaction(db, async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Message not found.');
      }

      const messageData = messageDoc.data() as ChatMessage;
      const currentReactions = messageData.reactions || {};
      
      const existingEmoji = Object.keys(currentReactions)[0];
      const newReactions = { ...currentReactions };
      
      // Case 1: Clicked emoji is different from the existing one (or there is no existing one)
      // This replaces the reaction entirely.
      if (emoji !== existingEmoji) {
          transaction.update(messageRef, { reactions: { [emoji]: [userId] } });
          return;
      }

      // Case 2: Clicked emoji is the same as the existing one.
      // We either add or remove the user from the list.
      const userList: string[] = newReactions[existingEmoji] || [];
      const userIndex = userList.indexOf(userId);

      if (userIndex > -1) {
        // User has already reacted with this emoji, so remove them.
        userList.splice(userIndex, 1);
      } else {
        // User has not reacted, so add them.
        userList.push(userId);
      }

      if (userList.length === 0) {
        // If no users are left reacting, remove the emoji key completely.
        delete newReactions[existingEmoji];
      } else {
        // Otherwise, update the list.
        newReactions[existingEmoji] = userList;
      }
      
      transaction.update(messageRef, { reactions: newReactions });
    });
    return { success: true };
  } catch (e: any) {
    console.error('Error toggling reaction:', e);
    return { error: 'Failed to update reaction.' };
  }
}
