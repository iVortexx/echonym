
import { PostFeed } from "@/components/post-feed";
import { getPostsByIds } from "@/lib/actions";
import { auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/lib/types";

async function getSavedPostsForUser(userId: string, searchQuery?: string) {
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
        posts = posts.filter(post => 
            post.searchKeywords?.includes(searchQuery.toLowerCase())
        );
    }

    return posts;
}

export default async function SavedPostsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    // Note: In a real app, we'd get the current user's ID from a server-side session.
    // For this environment, we'll assume we can get it, but it might be null.
    const userId = auth.currentUser?.uid;
    const q = (searchParams.q as string) || "";
    
    if (!userId) {
        return (
            <div className="text-center text-slate-400 py-16">
                <p className="text-lg font-mono">Please log in to see your saved posts.</p>
            </div>
        );
    }
    
    const posts = await getSavedPostsForUser(userId, q);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Saved Whispers
            </h1>
            <PostFeed posts={posts} isLoading={false} />
        </div>
    );
}
