"use client"
import { motion } from "framer-motion"
import { MessageCircle, Share, MoreHorizontal, Terminal, Zap, Hash, Text, UserIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { VoteButtons } from "./vote-buttons"
import { UserBadge } from "./user-badge"
import type { Post } from "@/lib/types"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface PostCardProps {
  post: Post
  isPreview?: boolean
}

export function PostCard({ post, isPreview = false }: PostCardProps) {
  const formatTimeAgo = (createdAt: any) => {
    if (!createdAt) return "..."

    let date: Date
    if (typeof createdAt === "string") {
      date = new Date(createdAt)
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000)
    } else {
      date = new Date() // Fallback for preview mode
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 5) return "just now"
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const CardLinkWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isPreview) {
      return <div>{children}</div>
    }
    return <Link href={`/post/${post.id}`} className="block cursor-pointer group">{children}</Link>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-slate-900/50 border-blue-500/20 rounded-lg backdrop-blur-sm hover:border-blue-400/40 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Link href={`/profile/${encodeURIComponent(post.anonName)}`} className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-blue-500/30">
                  {post.avatarUrl ? (
                    <AvatarImage src={post.avatarUrl} alt={post.anonName} />
                  ) : (
                    <AvatarFallback className="bg-blue-900/50 text-blue-300">
                      <UserIcon className="h-5 w-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Terminal className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  <Link href={`/profile/${encodeURIComponent(post.anonName)}`}>
                    <p className="font-mono text-sm text-blue-300 truncate hover:underline">{post.anonName || 'Anonymous'}</p>
                  </Link>
                  <UserBadge xp={post.xp || 0} />
                </div>
                <p className="text-slate-400 text-xs font-mono">
                  {formatTimeAgo(post.createdAt)}
                  {post.tag && (
                    <>
                      {" • "}
                      <Badge
                        variant="outline"
                        className="text-xs px-1 py-0 h-4 border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
                      >
                        <Hash className="h-2 w-2 mr-1" />
                        {post.tag}
                      </Badge>
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 flex-shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardLinkWrapper>
            <div className="relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="pl-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-2 leading-tight group-hover:text-blue-300 transition-colors">
                  {post.title || "Untitled Whisper"}
                </h3>
                 <div className="prose prose-sm prose-invert max-w-none text-slate-300 font-light line-clamp-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                </div>
                {post.summary && !isPreview && (
                  <Accordion type="single" collapsible className="w-full mt-2">
                    <AccordionItem value="item-1" className="border-b-0">
                      <AccordionTrigger className="flex items-center justify-start p-0 text-xs font-mono text-cyan-400 no-underline hover:no-underline [&>svg]:hidden">
                        <div className="flex items-center">
                          <Text className="h-3 w-3 mr-1.5" />
                          <span>View TL;DR</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-0 text-xs text-slate-400">
                        {post.summary}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </div>
          </CardLinkWrapper>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
            <div className="flex items-center space-x-1">
              <VoteButtons itemId={post.id} itemType="post" upvotes={post.upvotes} downvotes={post.downvotes} disabled={isPreview} />

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 font-mono text-xs"
                disabled={isPreview}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span>{post.commentCount || 0}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                disabled={isPreview}
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs font-mono text-slate-500">
                <span className="text-green-400">{post.upvotes || 0}↑</span>
                <span className="text-red-400">{post.downvotes || 0}↓</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
                <span className="text-xs font-mono text-slate-500">live</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
