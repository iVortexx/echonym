"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const commonTags = ["security", "reverse-eng", "web-security", "malware", "cve", "networking", "crypto", "forensics"]

export function PostForm() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tag, setTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Reset form
    setTitle("")
    setContent("")
    setTag("")
    setIsSubmitting(false)

    // In real app, would redirect to the new post
    alert("Post created successfully!")
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
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your findings, exploits, or insights..."
              required
              rows={6}
              className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag" className="text-slate-300 font-mono">
              Tag (optional)
            </Label>
            <Input
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., security, reverse-eng, malware"
              className="bg-slate-800/50 border-slate-600 text-slate-200 placeholder:text-slate-500"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {commonTags.map((commonTag) => (
                <Badge
                  key={commonTag}
                  variant="outline"
                  className="cursor-pointer border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                  onClick={() => setTag(commonTag)}
                >
                  {commonTag}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-mono"
          >
            {isSubmitting ? "Publishing..." : "Publish Whisper"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
