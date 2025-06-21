
"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createPost, scorePost } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, ShieldCheck, HelpCircle } from "lucide-react"
import { debounce } from "lodash"
import { PostCard } from "./post-card"
import type { Post } from "@/lib/types"

type ScoreState = {
  score: number
  clarity: string
  safety: string
}

export function PostForm() {
  const { user, firebaseUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraftSaved, setIsDraftSaved] = useState(false)

  const [aiScore, setAiScore] = useState<ScoreState | null>(null)
  const [isScoring, setIsScoring] = useState(false)

  // Load draft from localStorage on initial render
  useEffect(() => {
    const draft = localStorage.getItem("postDraft")
    if (draft) {
      const { title, content } = JSON.parse(draft)
      setTitle(title)
      setContent(content)
    }
  }, [])

  // Save draft to localStorage on change
  const debouncedSaveDraft = useCallback(
    debounce((newTitle: string, newContent: string) => {
      localStorage.setItem("postDraft", JSON.stringify({ title: newTitle, content: newContent }))
      setIsDraftSaved(true)
      setTimeout(() => setIsDraftSaved(false), 2000)
    }, 1000),
    []
  )

  useEffect(() => {
    if (title || content) {
      debouncedSaveDraft(title, content)
    }
  }, [title, content, debouncedSaveDraft])

  const debouncedGetScore = useCallback(
    debounce(async (newTitle: string, newContent: string) => {
      if (newContent.trim().length < 50 || newTitle.trim().length < 5) {
        setAiScore(null)
        return
      }
      setIsScoring(true)
      try {
        const result = await scorePost({ title: newTitle, content: newContent })
        setAiScore(result)
      } catch (error) {
        console.error("Failed to get AI score", error)
        setAiScore(null)
      } finally {
        setIsScoring(false)
      }
    }, 1500),
    []
  )

  useEffect(() => {
    debouncedGetScore(title, content)
  }, [title, content, debouncedGetScore])

  const parseTag = (text: string): string | undefined => {
    const match = text.match(/#(\w+)/)
    return match ? match[1] : undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be logged in to create a post.",
      })
      return
    }
    setIsSubmitting(true)
    const tag = parseTag(content)

    const result = await createPost({ title, content, tag }, firebaseUser.uid)

    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error Creating Post",
        description: result.error,
      })
      setIsSubmitting(false)
    } else {
      toast({
        title: "Whisper Published!",
        description: "Your post is now live.",
      })
      localStorage.removeItem("postDraft") // Clear draft on successful submission
      router.push("/")
    }
  }

  const previewPost: Post = {
    id: "preview",
    title: title || "Untitled Whisper",
    content: content || "Start typing to see your post live...",
    tag: parseTag(content),
    anonName: user?.anonName || "Anonymous",
    xp: user?.xp || 0,
    avatarUrl: user?.avatarUrl,
    createdAt: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    userId: user?.uid || "",
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
      {/* Editor Panel */}
      <Card className="bg-slate-900/50 border-blue-500/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300 font-mono">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your discovery?"
                required
                className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-slate-300 font-mono">
                Content (Markdown supported)
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your findings, exploits, or insights... Use #tags to categorize."
                required
                rows={12}
                maxLength={5000}
                className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500 resize-none font-mono text-sm leading-relaxed"
              />
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>{content.length} / 5000</span>
                <span className={`transition-opacity ${isDraftSaved ? 'opacity-100' : 'opacity-0'}`}>
                  Draft saved
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !title || !content}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-mono text-lg py-6 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Publishing...
                </>
              ) : (
                "Publish Whisper"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview and AI Score Panel */}
      <div className="space-y-8 mt-8 lg:mt-0">
        <div>
          <h3 className="text-lg font-bold font-headline text-slate-300 mb-2">Live Preview</h3>
          <PostCard post={previewPost} isPreview />
        </div>
        <div>
           <h3 className="text-lg font-bold font-headline text-slate-300 mb-2 flex items-center">
             AI Analysis
             {isScoring && <Loader2 className="ml-2 h-4 w-4 animate-spin text-cyan-400" />}
           </h3>
           <Card className="bg-slate-900/50 border-blue-500/20 backdrop-blur-sm p-6">
             {aiScore ? (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 relative h-20 w-20">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-700"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="text-cyan-400"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${aiScore.score}, 100`}
                        strokeLinecap="round"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-slate-100">{aiScore.score}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="flex items-center text-sm font-semibold text-slate-300">
                        <Sparkles className="h-4 w-4 mr-2 text-cyan-400"/>
                        Clarity
                      </h4>
                      <p className="text-xs text-slate-400">{aiScore.clarity}</p>
                    </div>
                     <div>
                      <h4 className="flex items-center text-sm font-semibold text-slate-300">
                        <ShieldCheck className="h-4 w-4 mr-2 text-green-400"/>
                        Safety
                      </h4>
                      <p className="text-xs text-slate-400">{aiScore.safety}</p>
                    </div>
                  </div>
                </div>
             ) : (
                <div className="text-center text-slate-500 font-mono text-sm py-8">
                  <HelpCircle className="mx-auto h-8 w-8 mb-2"/>
                  Start writing your post to get AI feedback on quality and safety.
               </div>
             )}
           </Card>
        </div>
      </div>
    </div>
  )
}
