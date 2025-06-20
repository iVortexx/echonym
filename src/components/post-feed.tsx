"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post } from "@/lib/types";
import { PostCard } from "./post-card";
import { Skeleton } from "./ui/skeleton";
import { AnimatePresence } from "framer-motion";

export function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card p-6 rounded-2xl border">
            <div className="flex items-center mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="ml-3 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <p className="text-lg">No whispers yet.</p>
        <p>Be the first to share a thought.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </AnimatePresence>
    </div>
  );
}
