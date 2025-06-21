
"use client"

import { PostFeed } from "@/components/post-feed"
import { Terminal, Flame, Rocket, Sparkles } from "lucide-react"
import { collection, query, orderBy, limit, where, onSnapshot, Query, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

type SortOrder = "latest" | "trending" | "top";

export default function Home() {
  const searchParams = useSearchParams();
  const sort = (searchParams.get('sort') as SortOrder) || "latest";
  const tag = (searchParams.get('tag') as string) || "all";
  const q = (searchParams.get('q') as string) || "";
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let qBuilder: Query<DocumentData> = collection(db, "posts");

    if (tag !== "all") {
      qBuilder = query(qBuilder, where("tag", "==", tag));
    }
    
    if (q) {
      const searchWords = q.toLowerCase().split(/\s+/).filter(Boolean);
      if (searchWords.length > 0) {
        qBuilder = query(qBuilder, where("searchKeywords", "array-contains-any", searchWords.slice(0, 30)));
      }
    }

    switch (sort) {
      case "trending":
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        qBuilder = query(qBuilder, where("createdAt", ">=", sevenDaysAgo), orderBy("createdAt", "desc"), orderBy("upvotes", "desc"));
        break;
      case "top":
        qBuilder = query(qBuilder, orderBy("upvotes", "desc"));
        break;
      case "latest":
      default:
        qBuilder = query(qBuilder, orderBy("createdAt", "desc"));
        break;
    }
  
    qBuilder = query(qBuilder, limit(50));

    const unsubscribe = onSnapshot(qBuilder, (querySnapshot) => {
      const newPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(newPosts);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [sort, tag, q]);
  
  return (
      <div className="space-y-8">
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Terminal className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              WhisperNet
            </h1>
          </div>
          <p className="text-slate-400 font-mono text-sm">{">"} anonymous security research & exploits</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <Tabs defaultValue={sort} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="latest" asChild><Link href={`/?sort=latest&tag=${tag}&q=${q}`}><Sparkles className="mr-2 h-4 w-4" />Latest</Link></TabsTrigger>
                  <TabsTrigger value="trending" asChild><Link href={`/?sort=trending&tag=${tag}&q=${q}`}><Flame className="mr-2 h-4 w-4" />Trending</Link></TabsTrigger>
                  <TabsTrigger value="top" asChild><Link href={`/?sort=top&tag=${tag}&q=${q}`}><Rocket className="mr-2 h-4 w-4" />Top</Link></TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        {posts.length === 0 && q && !loading ? (
           <div className="text-center text-slate-400 py-16">
             <div className="mb-4">
               <div className="text-6xl mb-4">🤷</div>
             </div>
             <p className="text-lg font-mono">No results found for "{q}"</p>
             <p className="font-mono text-sm">Try a different search term.</p>
           </div>
        ) : (
          <PostFeed posts={posts} isLoading={loading} />
        )}
      </div>
  )
}
