"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VoteButtonsProps {
  itemId: string
  itemType: "post" | "comment"
  upvotes: number
  downvotes: number
  postId?: string
}

export function VoteButtons({ itemId, itemType, upvotes, downvotes, postId }: VoteButtonsProps) {
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes)
  const [currentDownvotes, setCurrentDownvotes] = useState(downvotes)

  const handleVote = (voteType: "up" | "down") => {
    if (userVote === voteType) {
      // Remove vote
      if (voteType === "up") {
        setCurrentUpvotes(currentUpvotes - 1)
      } else {
        setCurrentDownvotes(currentDownvotes - 1)
      }
      setUserVote(null)
    } else {
      // Change or add vote
      if (userVote === "up") {
        setCurrentUpvotes(currentUpvotes - 1)
        setCurrentDownvotes(currentDownvotes + 1)
      } else if (userVote === "down") {
        setCurrentDownvotes(currentDownvotes - 1)
        setCurrentUpvotes(currentUpvotes + 1)
      } else {
        if (voteType === "up") {
          setCurrentUpvotes(currentUpvotes + 1)
        } else {
          setCurrentDownvotes(currentDownvotes + 1)
        }
      }
      setUserVote(voteType)
    }
  }

  const getVoteScore = () => currentUpvotes - currentDownvotes

  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          userVote === "up"
            ? "text-green-400 bg-green-500/20 hover:bg-green-500/30"
            : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
        }`}
        onClick={() => handleVote("up")}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className="text-sm font-mono text-slate-300 min-w-[2rem] text-center">{getVoteScore()}</span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          userVote === "down"
            ? "text-red-400 bg-red-500/20 hover:bg-red-500/30"
            : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        }`}
        onClick={() => handleVote("down")}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  )
}
