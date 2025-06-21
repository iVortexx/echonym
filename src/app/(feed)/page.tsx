
import { PostFeed } from "@/components/post-feed"
import { Terminal, Flame, Rocket, Sparkles } from "lucide-react"
import { collection, query, orderBy, getDocs, limit, where, Query, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Post } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

type SortOrder = "latest" | "trending" | "top";

async function getPosts(sort: SortOrder = "latest", tag: string = "all", searchQuery: string = ""): Promise<Post[]> {
  let q: Query<DocumentData> = collection(db, "posts");

  if (tag !== "all") {
    q = query(q, where("tag", "==", tag));
  }
  
  if (searchQuery) {
    q = query(q, where("searchKeywords", "array-contains", searchQuery.toLowerCase()));
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
  
  q = query(q, limit(50)); // Limit to 50 for now

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
}


export default async function Home({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const sort = (searchParams.sort as SortOrder) || "latest";
  const tag = (searchParams.tag as string) || "all";
  const q = (searchParams.q as string) || "";

  const posts = await getPosts(sort, tag, q);
  
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
                  <TabsTrigger value="latest" asChild><Link href={`/?sort=latest&tag=${tag}`}><Sparkles className="mr-2 h-4 w-4" />Latest</Link></TabsTrigger>
                  <TabsTrigger value="trending" asChild><Link href={`/?sort=trending&tag=${tag}`}><Flame className="mr-2 h-4 w-4" />Trending</Link></TabsTrigger>
                  <TabsTrigger value="top" asChild><Link href={`/?sort=top&tag=${tag}`}><Rocket className="mr-2 h-4 w-4" />Top</Link></TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        <PostFeed posts={posts} isLoading={false} />
      </div>
  )
}
