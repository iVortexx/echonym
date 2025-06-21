"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { handleVote } from "@/lib/actions"

interface VoteButtonsProps {
  itemId: string
  itemType: "post" | "comment"
  upvotes: number
  downvotes: number
  postId?: string
  disabled?: boolean
}

export function VoteButtons({ itemId, itemType, upvotes, downvotes, postId, disabled = false }: VoteButtonsProps) {
  const { firebaseUser } = useAuth()
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes)
  const [currentDownvotes, setCurrentDownvotes] = useState(downvotes)
  const [isVoting, setIsVoting] = useState(false)

  const onVote = async (voteType: "up" | "down") => {
    if (!firebaseUser || isVoting || disabled) return
    setIsVoting(true)

    let previousVote = userVote;
    
    // Optimistic UI update
    if (userVote === voteType) { // Undoing a vote
      setUserVote(null)
      voteType === "up" ? setCurrentUpvotes(c => c - 1) : setCurrentDownvotes(c => c - 1)
    } else { // Casting a new vote or changing vote
      setUserVote(voteType)
      if (voteType === "up") {
        setCurrentUpvotes(c => c + 1)
        if (previousVote === "down") setCurrentDownvotes(c => c - 1)
      } else { // downvoting
        setCurrentDownvotes(c => c + 1)
        if (previousVote === "up") setCurrentUpvotes(c => c - 1)
      }
    }

    const result = await handleVote(firebaseUser.uid, itemId, itemType, voteType, postId);
    
    // If the server fails, revert the optimistic update
    if (result?.error) {
      setUserVote(previousVote);
      if (userVote === voteType) {
        voteType === "up" ? setCurrentUpvotes(c => c + 1) : setCurrentDownvotes(c => c + 1)
      } else {
        if (voteType === "up") {
          setCurrentUpvotes(c => c - 1)
          if (previousVote === "down") setCurrentDownvotes(c => c + 1)
        } else {
          setCurrentDownvotes(c => c - 1)
          if (previousVote === "up") setCurrentUpvotes(c => c + 1)
        }
      }
    }

    setIsVoting(false)
  }

  const getVoteScore = () => (currentUpvotes || 0) - (currentDownvotes || 0)

  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={isVoting || disabled}
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          userVote === "up"
            ? "text-green-400 bg-green-500/20 hover:bg-green-500/30"
            : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
        } disabled:opacity-50`}
        onClick={() => onVote("up")}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className="text-sm font-mono text-slate-300 min-w-[2rem] text-center">{getVoteScore()}</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isVoting || disabled}
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          userVote === "down"
            ? "text-red-400 bg-red-500/20 hover:bg-red-500/30"
            : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        } disabled:opacity-50`}
        onClick={() => onVote("down")}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  )
}
