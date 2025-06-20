"use server";

import { z } from "zod";
import { auth, db, storage } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, runTransaction, query, where, getDocs, writeBatch } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { Post, VoteType, User } from "./types";
import { suggestTags } from "@/ai/flows/suggest-tags";

const PostSchema = z.object({
    title: z.string().min(1, "Title is required").max(100),
    content: z.string().min(1, "Content is required"),
    tag: z.string().optional(),
    imageBase64: z.string().optional(),
});

export async function createPost(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validation = PostSchema.safeParse(rawData);

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors };
    }
    
    const { title, content, tag, imageBase64 } = validation.data;

    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("You must be logged in to post.");
    }
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    try {
        let imageUrl: string | undefined = undefined;
        if (imageBase64) {
            const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}`);
            const snapshot = await uploadString(storageRef, imageBase64, 'data_url');
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const postData = {
            userId: currentUser.uid,
            title,
            content,
            tag,
            imageUrl,
            createdAt: serverTimestamp(),
            upvotes: 0,
            downvotes: 0,
            commentCount: 0,
        };
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }
            const userData = userDoc.data() as User;
            const newXp = userData.xp + 10;
            
            transaction.update(userDocRef, { xp: newXp });
            
            const postCollectionRef = collection(db, 'posts');
            transaction.set(doc(postCollectionRef), { ...postData, anonName: userData.anonName });
        });

        revalidatePath('/');
        return { success: true };

    } catch (e) {
        console.error("Error creating post:", e);
        return { error: "Failed to create post." };
    }
}

const CommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty"),
    postId: z.string(),
});

export async function createComment(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validation = CommentSchema.safeParse(rawData);

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors };
    }
    
    const { content, postId } = validation.data;

    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("You must be logged in to comment.");
    }
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    const postDocRef = doc(db, 'posts', postId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            const postDoc = await transaction.get(postDocRef);

            if (!userDoc.exists() || !postDoc.exists()) {
                throw "User or Post document does not exist!";
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
                userId: currentUser.uid,
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
    } catch(e) {
        console.error("Error creating comment:", e);
        return { error: "Failed to create comment." };
    }
}


export async function handleVote(
    itemId: string, 
    itemType: 'post' | 'comment', 
    voteType: VoteType,
    postId?: string,
) {
    const currentUser = auth.currentUser;
    if (!currentUser) return { error: "Not authenticated" };

    if (itemType === 'comment' && !postId) {
        return { error: "Post ID is missing for comment vote." };
    }

    const itemRef = itemType === 'post' 
        ? doc(db, "posts", itemId) 
        : doc(db, `posts/${postId}/comments/${itemId}`);

    const { uid } = currentUser;
    const voteQuery = query(
        collection(db, "votes"),
        where("userId", "==", uid),
        where(itemType === 'post' ? "postId" : "commentId", "==", itemId)
    );

    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) throw new Error("Item not found");

            const postAuthorId = itemDoc.data().userId;
            const postAuthorRef = doc(db, 'users', postAuthorId);
            
            const voteDocs = await getDocs(voteQuery);
            const existingVoteDoc = voteDocs.docs[0];

            let upvoteChange = 0;
            let downvoteChange = 0;
            let xpChange = 0;

            if (existingVoteDoc) { // User is changing their vote or removing it
                const existingVote = existingVoteDoc.data();
                const voteRef = doc(db, "votes", existingVoteDoc.id);

                if (existingVote.type === voteType) { // Removing vote
                    transaction.delete(voteRef);
                    if (voteType === 'up') {
                        upvoteChange = -1;
                        xpChange = -2;
                    } else {
                        downvoteChange = -1;
                    }
                } else { // Changing vote
                    transaction.update(voteRef, { type: voteType });
                    if (voteType === 'up') { // was down, now up
                        upvoteChange = 1;
                        downvoteChange = -1;
                        xpChange = 2;
                    } else { // was up, now down
                        upvoteChange = -1;
                        downvoteChange = 1;
                        xpChange = -2;
                    }
                }
            } else { // New vote
                const newVoteRef = doc(collection(db, "votes"));
                transaction.set(newVoteRef, {
                    userId: uid,
                    [itemType === 'post' ? "postId" : "commentId"]: itemId,
                    type: voteType,
                });
                if (voteType === 'up') {
                    upvoteChange = 1;
                    xpChange = 2;
                } else {
                    downvoteChange = 1;
                }
            }
            
            const currentUpvotes = itemDoc.data().upvotes || 0;
            const currentDownvotes = itemDoc.data().downvotes || 0;
            transaction.update(itemRef, {
                upvotes: currentUpvotes + upvoteChange,
                downvotes: currentDownvotes + downvoteChange,
            });

            if (xpChange !== 0 && postAuthorId !== uid) {
                 const authorDoc = await transaction.get(postAuthorRef);
                 if (authorDoc.exists()) {
                     const newXp = (authorDoc.data().xp || 0) + xpChange;
                     transaction.update(postAuthorRef, { xp: newXp });
                 }
            }
        });
        
        if (itemType === 'comment' && postId) {
            revalidatePath(`/post/${postId}`);
        } else {
            revalidatePath(`/`);
            revalidatePath(`/post/${itemId}`);
        }

        return { success: true };
    } catch (e) {
        console.error("Vote transaction failed: ", e);
        return { error: "Failed to process vote." };
    }
}


export async function getTagSuggestions(content: string) {
    if (!content.trim()) {
        return { tags: [] };
    }
    try {
        const result = await suggestTags({ content });
        return { tags: result.tags };
    } catch (error) {
        console.error("Error fetching tag suggestions:", error);
        return { tags: [] };
    }
}
