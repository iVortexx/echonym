
"use client"

import { PostFeed } from "@/components/post-feed";
import { getHiddenPostsForUser } from "@/lib/actions";
import { useAuth } from "@/hooks/use-auth";
import type { Post } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function HiddenPostSkeleton() {
    return (
        <div className="space-y-4">
             <Skeleton className="h-10 w-1/3" />
             <Skeleton className="h-10 w-full" />
            {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center mb-4">
                <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                <div className="ml-3 space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-32 bg-muted" />
                    <Skeleton className="h-4 w-12 bg-muted" />
                    </div>
                    <Skeleton className="h-3 w-24 bg-muted" />
                </div>
                </div>
                <Skeleton className="h-6 w-3/4 mb-2 bg-muted" />
                <Skeleton className="h-4 w-full bg-muted" />
                <Skeleton className="h-4 w-2/3 mt-1 bg-muted" />
            </div>
            ))}
      </div>
    )
}

export default function HiddenPostsPage() {
    const { user, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || "";

    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }
        if (!user) {
            setLoading(false);
            return;
        }
        
        async function fetchData() {
            setLoading(true);
            const hiddenPosts = await getHiddenPostsForUser(user.uid, q);
            setPosts(hiddenPosts);
            setLoading(false);
        }

        fetchData();
    }, [user, authLoading, q]);

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
        router.push(`/hidden?${params.toString()}`);
    };
    
    if (authLoading || loading) {
        return <HiddenPostSkeleton />;
    }
    
    if (!user) {
        return (
            <div className="text-center text-slate-400 py-16">
                <p className="text-lg font-mono">Please log in to see your hidden echoes.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
             <div className="text-center md:text-left">
                <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Hidden Echoes
                </h1>
                <p className="text-slate-400 font-mono text-sm mt-1">{'>'} echoes you've chosen to remove from your feed</p>
            </div>
             <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    name="search"
                    placeholder="Search your hidden echoes..."
                    defaultValue={q}
                    className="bg-card border-border pl-9"
                />
            </form>
            <PostFeed posts={posts} isLoading={false} filterHiddenPosts={false} />
        </div>
    );
}
