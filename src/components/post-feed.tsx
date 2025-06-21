
"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import type { Post, VoteType } from "@/lib/types"
import { PostCard } from "./post-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { getUserVotes } from "@/lib/actions"
import { Ghost } from "lucide-react"

interface PostFeedProps {
  posts: Post[];
  isLoading: boolean;
  filterHiddenPosts?: boolean;
}

export function PostFeed({ posts: initialPosts, isLoading, filterHiddenPosts = true }: PostFeedProps) {
  const { user } = useAuth();
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);

  useEffect(() => {
    let postsToShow = initialPosts;
    if (filterHiddenPosts) {
        const hiddenPostIds = user?.hiddenPosts || [];
        postsToShow = initialPosts.filter(post => !hiddenPostIds.includes(post.id));
    }
    setVisiblePosts(postsToShow);
  }, [initialPosts, user, filterHiddenPosts]);

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
          <div key={i} className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center mb-4">
              <Skeleton className="h-10 w-10 rounded-full bg-muted" />
              <div className="ml-3 space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-32 bg-muted" />
                  <Skeleton className="h-4 w-12 bg-muted" />
                </div>
                <Skeleton className="h-3 w-24 bg-muted" />
              </div>
            </div>
            <Skeleton className="h-6 w-3/4 mb-3 bg-muted" />
            <Skeleton className="h-4 w-full bg-muted" />
            <Skeleton className="h-4 w-2/3 mt-2 bg-muted" />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16 bg-muted rounded-md" />
                <Skeleton className="h-8 w-16 bg-muted rounded-md" />
              </div>
              <Skeleton className="h-4 w-16 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div>
      {visiblePosts.length === 0 ? (
         <div className="text-center text-slate-500 py-16">
            <Ghost className="mx-auto h-16 w-16 mb-4" />
            <p className="text-lg font-mono text-slate-400">No echoes detected.</p>
            <p className="font-mono text-sm">Looks like it's quiet in this corner of the network.</p>
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
