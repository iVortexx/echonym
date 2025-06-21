
"use client"

import type React from "react"
import { useCallback, useEffect, useState, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createPost, scorePost, updatePost } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, ShieldCheck, HelpCircle, Hash, X } from "lucide-react"
import { debounce } from "lodash"
import { PostCard } from "./post-card"
import type { Post } from "@/lib/types"
import { Badge } from "./ui/badge"

type ScoreState = {
  score: number
  clarity: string
  safety: string
}

interface PostFormProps {
    postToEdit?: Post;
}


export function PostForm({ postToEdit }: PostFormProps) {
  const { user, firebaseUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const isEditing = !!postToEdit;

  const [title, setTitle] = useState(postToEdit?.title || "")
  const [content, setContent] = useState(postToEdit?.content || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraftSaved, setIsDraftSaved] = useState(false)
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(postToEdit?.tags || []);


  const [aiScore, setAiScore] = useState<ScoreState | null>(null)
  const [isScoring, setIsScoring] = useState(false)

  // Load draft from localStorage on initial render for new posts
  useEffect(() => {
    if (!isEditing) {
        const draft = localStorage.getItem("postDraft")
        if (draft) {
          const { title, content, tags } = JSON.parse(draft)
          setTitle(title)
          setContent(content)
          setTags(tags || [])
        }
    }
  }, [isEditing])

  // Save draft to localStorage on change for new posts
  const debouncedSaveDraft = useCallback(
    debounce((newTitle: string, newContent: string, newTags: string[]) => {
      localStorage.setItem("postDraft", JSON.stringify({ title: newTitle, content: newContent, tags: newTags }))
      setIsDraftSaved(true)
      setTimeout(() => setIsDraftSaved(false), 2000)
    }, 1000),
    []
  )

  useEffect(() => {
    if (!isEditing && (title || content || tags.length > 0)) {
      debouncedSaveDraft(title, content, tags)
    }
  }, [title, content, tags, debouncedSaveDraft, isEditing])

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

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/#/g, '');
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };


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

    const result = isEditing 
        ? await updatePost(postToEdit.id, { title, content, tags }, firebaseUser.uid)
        : await createPost({ title, content, tags }, firebaseUser.uid);


    if (result?.error) {
      toast({
        variant: "destructive",
        title: isEditing ? "Error Updating Post" : "Error Creating Post",
        description: result.error,
      })
      setIsSubmitting(false)
    } else {
      toast({
        title: isEditing ? "Whisper Updated!" : "Whisper Published!",
        description: "Your post is now live.",
      })
      
      if (result?.warning) {
        setTimeout(() => {
          toast({
              title: "Heads up",
              description: result.warning,
              duration: 5000,
          })
        }, 500);
      }
      
      if (!isEditing) {
        localStorage.removeItem("postDraft") // Clear draft on successful submission
      }
      router.push(result.postId ? `/post/${result.postId}` : "/");
    }
  }

  const previewPost: Post = {
    id: postToEdit?.id || "preview",
    title: title || "Untitled Whisper",
    content: content || "Start typing to see your post live...",
    tags: tags,
    anonName: user?.anonName || "Anonymous",
    xp: user?.xp || 0,
    avatarUrl: user?.avatarUrl,
    createdAt: postToEdit?.createdAt || new Date().toISOString(),
    upvotes: postToEdit?.upvotes || 0,
    downvotes: postToEdit?.downvotes || 0,
    commentCount: postToEdit?.commentCount || 0,
    userId: user?.uid || "",
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
      {/* Editor Panel */}
      <Card className="bg-card border-border">
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
                className="bg-input border-border text-slate-200 placeholder:text-slate-500 text-lg"
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
                placeholder="Share your findings, exploits, or insights..."
                required
                rows={12}
                maxLength={5000}
                className="bg-input border-border text-slate-200 placeholder:text-slate-500 resize-none font-mono text-sm leading-relaxed"
              />
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>{content.length} / 5000</span>
                {!isEditing && (
                    <span className={`transition-opacity ${isDraftSaved ? 'opacity-100' : 'opacity-0'}`}>
                    Draft saved
                    </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-slate-300 font-mono">
                Tags (up to 5)
              </Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Type a tag and press Space or Enter"
                className="bg-input border-border text-slate-200 placeholder:text-slate-500"
                disabled={tags.length >= 5}
              />
              <div className="flex flex-wrap gap-2 pt-2 min-h-[2.5rem]">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-accent bg-accent/10 border-accent/30 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full hover:bg-accent/20 p-0.5 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>


            <Button
              type="submit"
              disabled={isSubmitting || !title || !content}
              className="w-full bg-gradient-to-r from-primary to-accent text-white font-mono text-lg py-6 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isEditing ? "Saving..." : "Publishing..."}
                </>
              ) : (
                isEditing ? "Save Changes" : "Publish Whisper"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview and AI Score Panel */}
      <div className="space-y-8 mt-8 lg:mt-0">
        <div>
          <h3 className="text-lg font-bold font-mono text-slate-300 mb-2">Live Preview</h3>
          <PostCard post={previewPost} isPreview />
        </div>
        <div>
           <h3 className="text-lg font-bold font-mono text-slate-300 mb-2 flex items-center">
             AI Analysis
             {isScoring && <Loader2 className="ml-2 h-4 w-4 animate-spin text-accent" />}
           </h3>
           <Card className="bg-card border-border p-6">
             {aiScore ? (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 relative h-20 w-20">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <path
                        className="text-muted"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="text-accent"
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
                        <Sparkles className="h-4 w-4 mr-2 text-accent"/>
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
