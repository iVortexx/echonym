
"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createComment } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Send, UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"

interface CommentFormProps {
  postId: string
  parentId?: string
  onCommentPosted: () => void
  onCancel?: () => void
  autofocus?: boolean
}

export function CommentForm({
  postId,
  parentId,
  onCommentPosted,
  onCancel,
  autofocus = false,
}: CommentFormProps) {
  const { user, firebaseUser } = useAuth()
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user || !firebaseUser) return

    setIsSubmitting(true)
    const result = await createComment(
      { content, postId, parentId },
      user.uid
    )

    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
      setIsSubmitting(false)
    } else {
      toast({
        title: "Comment posted!",
        description: "Your insights have been added to the discussion.",
      })
      setContent("")
      // No need to set submitting to false here as the component will reset/unmount
      onCommentPosted()
    }
  }

  if (!user) return null

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3 w-full">
      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
        <AvatarImage src={user.avatarUrl} alt={user.anonName} />
        <AvatarFallback className="bg-blue-900/50 text-blue-300">
           <UserIcon className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentId ? "Write a reply..." : "Add a comment..."}
            rows={1}
            autoFocus={autofocus}
            className="bg-slate-800/70 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none min-h-[40px] pr-12 focus:min-h-[80px] transition-all duration-300"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              size="icon"
              disabled={!content.trim() || isSubmitting}
              className="h-8 w-8 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-auto px-2 py-1 text-xs text-slate-400">
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
