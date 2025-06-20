"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Post } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { UserBadge } from "./user-badge";
import { VoteButtons } from "./vote-buttons";
import { Badge } from "./ui/badge";
import { MessageSquare, Dot } from "lucide-react";

type PostCardProps = {
  post: Post;
  isLink?: boolean;
};

export function PostCard({ post, isLink = true }: PostCardProps) {
  const cardContent = (
    <>
      {post.tag && <Badge variant="secondary" className="mb-2">{post.tag}</Badge>}
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold font-headline mb-2">{post.title}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <span className="font-code text-accent">{post.anonName}</span>
          <UserBadge xp={post.xp} className="ml-2" />
          <Dot />
          <span>{post.createdAt ? formatDistanceToNow(typeof post.createdAt === 'string' ? new Date(post.createdAt) : post.createdAt.toDate()) : '...'} ago</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-foreground/80 whitespace-pre-wrap line-clamp-4">{post.content}</p>
        {post.imageUrl && (
          <div className="mt-4 relative aspect-video w-full overflow-hidden rounded-lg border">
            <Image src={post.imageUrl} alt={post.title} sizes="100vw" className="w-full h-full object-cover" />
          </div>
        )}
      </CardContent>
      <CardFooter className="p-0 mt-4 flex justify-between items-center">
        <VoteButtons itemId={post.id} itemType="post" upvotes={post.upvotes} downvotes={post.downvotes} />
        <div className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span>{post.commentCount || 0}</span>
        </div>
      </CardFooter>
    </>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 rounded-2xl border-border/60 hover:border-primary/50 transition-all duration-300 bg-card">
        {isLink ? (
          <Link href={`/post/${post.id}`} className="block">
            {cardContent}
          </Link>
        ) : (
          <div>{cardContent}</div>
        )}
      </Card>
    </motion.div>
  );
}
