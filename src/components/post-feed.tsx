
"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, orderBy, getDocs, limit, startAfter, where, Query, DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AnimatePresence } from "framer-motion"
import type { Post, VoteType } from "@/lib/types"
import { PostCard } from "./post-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "./ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ALLOWED_TAGS } from "@/lib/utils"
import { Flame, Rocket, Sparkles, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getUserVotes } from "@/lib/actions"

const POSTS_PER_PAGE = 5;
type SortOrder = "latest" | "trending" | "top";

export function PostFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [sort, setSort] = useState<SortOrder>("latest")
  const [tag, setTag] = useState<string>("all")
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true)
    }

    try {
      let q: Query<DocumentData> = collection(db, "posts");

      // Filtering
      if (tag !== "all") {
        q = query(q, where("tag", "==", tag));
      }

      // Sorting
      switch (sort) {
        case "trending":
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          q = query(q, where("createdAt", ">=", sevenDaysAgo), orderBy("createdAt", "desc"), orderBy("upvotes", "desc"));
          break;
        case "top":
          q = query(q, orderBy("upvotes", "desc"));
          break;
        case "latest":
        default:
          q = query(q, orderBy("createdAt", "desc"));
          break;
      }
      
      // Pagination
      const currentLastDoc = reset ? null : lastDoc;
      if (currentLastDoc) {
        q = query(q, startAfter(currentLastDoc));
      }
      q = query(q, limit(POSTS_PER_PAGE));

      const documentSnapshots = await getDocs(q);
      
      const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);

      if (user && newPosts.length > 0) {
        const postIds = newPosts.map(p => p.id);
        const votes = await getUserVotes(user.uid, postIds, 'post');
        setUserVotes(prevVotes => ({ ...prevVotes, ...votes }));
      }
      
      setPosts(prevPosts => reset ? newPosts : [...prevPosts, ...newPosts]);
      
      const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastDoc(lastVisible || null);

      if (documentSnapshots.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, tag, lastDoc, hasMore, loadingMore, user]);

  useEffect(() => {
    setPosts([]);
    setLastDoc(null);
    setHasMore(true);
    fetchPosts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, tag]);

  const handleLoadMore = () => {
    fetchPosts(false);
  };

  if (loading) {
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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Tabs value={sort} onValueChange={(value) => setSort(value as SortOrder)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="latest"><Sparkles className="mr-2 h-4 w-4" />Latest</TabsTrigger>
                    <TabsTrigger value="trending"><Flame className="mr-2 h-4 w-4" />Trending</TabsTrigger>
                    <TabsTrigger value="top"><Rocket className="mr-2 h-4 w-4" />Top</TabsTrigger>
                </TabsList>
            </Tabs>
            <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {ALLOWED_TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

      {posts.length === 0 ? (
         <div className="text-center text-slate-400 py-16">
          <div className="mb-4">
            <div className="text-6xl mb-4">👻</div>
          </div>
          <p className="text-lg font-mono">No transmissions detected for this query.</p>
          <p className="font-mono text-sm">Try a different filter or be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} userVote={userVotes[post.id]} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-8 text-center">
        {loadingMore ? (
          <div className="flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : hasMore ? (
          <Button onClick={handleLoadMore} variant="outline" className="font-mono">
            Load More Whispers
          </Button>
        ) : (
          posts.length > 0 && <p className="text-slate-500 font-mono text-sm">You've reached the end of the transmission.</p>
        )}
      </div>
    </div>
  )
}
