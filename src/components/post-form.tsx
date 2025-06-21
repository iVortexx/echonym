"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createPost, getTagSuggestions } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Wand2, Loader2 } from "lucide-react"
import { debounce } from "lodash"

const commonTags = ["security", "reverse-eng", "web-security", "malware", "cve", "networking", "crypto", "forensics"]

export function PostForm() {
  const { user, firebaseUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tag, setTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiTags, setAiTags] = useState<string[]>([])
  const [isSuggestingTags, setIsSuggestingTags] = useState(false)

  const debouncedSuggestTags = useCallback(
    debounce(async (newContent: string) => {
      if (newContent.trim().length < 50) {
        setAiTags([])
        return
      }
      setIsSuggestingTags(true)
      try {
        const { tags } = await getTagSuggestions(newContent)
        setAiTags(tags.filter((t) => t !== tag)) // Don't suggest the current tag
      } catch (error) {
        console.error("Failed to get AI suggestions", error)
        setAiTags([])
      } finally {
        setIsSuggestingTags(false)
      }
    }, 1000),
    [tag]
  )

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    debouncedSuggestTags(newContent)
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
      // In a real app, you'd likely redirect to the new post page
      // For now, just redirect to home.
      router.push("/")
    }
  }

  return (
    <Card className="bg-slate-900/50 border-blue-500/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-mono text-blue-300">New Whisper</CardTitle>
      </CardHeader>
      <CardContent>
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
              className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-slate-300 font-mono">
              Content
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              placeholder="Share your findings, exploits, or insights..."
              required
              rows={8}
              maxLength={2000}
              className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500 resize-none"
            />
            <div className="text-right text-xs font-mono text-slate-400">
              {content.length} / 2000
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tag" className="text-slate-300 font-mono">
                  Tag (optional)
                </Label>
                {isSuggestingTags && <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />}
              </div>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g., cve, malware-analysis"
                className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {(aiTags.length > 0 || commonTags.length > 0) && (
              <div className="space-y-3">
                {aiTags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-mono text-slate-400 mb-2 flex items-center">
                      <Wand2 className="h-4 w-4 mr-2 text-cyan-400" />
                      AI Suggestions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {aiTags.map((aiTag) => (
                        <Badge
                          key={aiTag}
                          variant="outline"
                          className="cursor-pointer border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                          onClick={() => setTag(aiTag)}
                        >
                          {aiTag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-mono text-slate-400 mb-2">Common Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {commonTags.map((commonTag) => (
                      <Badge
                        key={commonTag}
                        variant="outline"
                        className="cursor-pointer border-slate-600 text-slate-400 bg-slate-800/30 hover:bg-slate-700/50 transition-colors"
                        onClick={() => setTag(commonTag)}
                      >
                        {commonTag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !title || !content}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-mono disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
              </>
            ) : (
              "Publish Whisper"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
