
"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import type { Post, VoteType } from "@/lib/types"
import { PostCard } from "./post-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { getUserVotes } from "@/lib/actions"

interface PostFeedProps {
  posts: Post[];
  isLoading: boolean;
}

export function PostFeed({ posts: initialPosts, isLoading }: PostFeedProps) {
  const { user } = useAuth();
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);

  useEffect(() => {
    const hiddenPostIds = user?.hiddenPosts || [];
    const postsToShow = initialPosts.filter(post => !hiddenPostIds.includes(post.id));
    setVisiblePosts(postsToShow);
  }, [initialPosts, user]);

  useEffect(() => {
    async function fetchVotes() {
      if (user && initialPosts.length > 0) {
        const postIds = initialPosts.map(p => p.id);
        const votes = await getUserVotes(user.uid, postIds, 'post');
        setUserVotes(prevVotes => ({ ...prevVotes, ...votes }));
      }
    }
    fetchVotes();
  }, [user, initialPosts]);
  
  const handlePostHide = (postId: string) => {
    setVisiblePosts(currentPosts => currentPosts.filter(p => p.id !== postId));
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900/50 p-6 rounded-lg border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <Skeleton className="h-8 w-8 rounded-full bg-slate-700/50" />
              <div className="ml-3 space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-32 bg-slate-700/50" />
                  <Skeleton className="h-4 w-12 bg-slate-700/50" />
                </div>
                <Skeleton className="h-3 w-24 bg-slate-700/50" />
              </div>
            </div>
            <Skeleton className="h-6 w-3/4 mb-2 bg-slate-700/50" />
            <Skeleton className="h-4 w-full bg-slate-700/50" />
            <Skeleton className="h-4 w-2/3 mt-1 bg-slate-700/50" />
            <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-700/50">
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16 bg-slate-700/50 rounded" />
                <Skeleton className="h-8 w-12 bg-slate-700/50 rounded" />
              </div>
              <Skeleton className="h-4 w-16 bg-slate-700/50" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div>
      {visiblePosts.length === 0 ? (
         <div className="text-center text-slate-400 py-16">
          <div className="mb-4">
            <div className="text-6xl mb-4">👻</div>
          </div>
          <p className="text-lg font-mono">No transmissions detected.</p>
          <p className="font-mono text-sm">Try a different filter or be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {visiblePosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                userVote={userVotes[post.id]} 
                onPostHide={handlePostHide}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
