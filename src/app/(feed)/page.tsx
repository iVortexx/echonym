
"use client"

import { PostFeed } from "@/components/post-feed"
import { Flame, Rocket, Sparkles, Search } from "lucide-react"
import { collection, query, orderBy, limit, where, onSnapshot, Query, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import Image from "next/image"

type SortOrder = "latest" | "trending" | "top";

export default function Home() {
  const router = useRouter();
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
      qBuilder = query(qBuilder, where("tags", "array-contains", tag));
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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get("search") as string;
    const params = new URLSearchParams(searchParams);
    
    if (searchQuery) {
        params.set("q", searchQuery);
    } else {
        params.delete("q");
    }
    router.push(`/?${params.toString()}`);
  };
  
  return (
      <div className="space-y-8">
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Image src="/logo.png" width={48} height={48} alt="Echonym Logo" className="rounded-sm" />
            <h1 className="text-3xl font-sans font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Echonym
            </h1>
          </div>
          <p className="text-slate-400 text-sm">Whispers from the digital underground</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <Tabs defaultValue={sort} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="latest" asChild><Link href={`/?sort=latest&tag=${tag}&q=${q}`}><Sparkles className="mr-2 h-4 w-4" />Latest</Link></TabsTrigger>
                  <TabsTrigger value="trending" asChild><Link href={`/?sort=trending&tag=${tag}&q=${q}`}><Flame className="mr-2 h-4 w-4" />Trending</Link></TabsTrigger>
                  <TabsTrigger value="top" asChild><Link href={`/?sort=top&tag=${tag}&q=${q}`}><Rocket className="mr-2 h-4 w-4" />Top</Link></TabsTrigger>
                </TabsList>
            </Tabs>
            <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    name="search"
                    placeholder="Search echoes..."
                    defaultValue={q}
                    className="bg-card border-border pl-9 w-full"
                />
            </form>
        </div>

        {posts.length === 0 && (q || tag !== 'all') && !loading ? (
           <div className="text-center text-slate-400 py-16">
             <div className="mb-4">
               <div className="text-6xl mb-4">🤷</div>
             </div>
             <p className="text-lg font-mono">No results found {q ? `for "${q}"` : ''} {tag !== 'all' ? `in #${tag}`: ''}</p>
             <p className="font-mono text-sm">Try a different search or filter.</p>
           </div>
        ) : (
          <PostFeed posts={posts} isLoading={loading} />
        )}
      </div>
  )
}
