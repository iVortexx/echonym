
"use client"

import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { handleVote } from "@/lib/actions"
import type { VoteType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface VoteButtonsProps {
  itemId: string
  itemType: "post" | "comment"
  upvotes: number
  downvotes: number
  postId?: string
  disabled?: boolean
  initialVoteStatus?: VoteType | null
}

export function VoteButtons({ 
    itemId, 
    itemType, 
    upvotes, 
    downvotes, 
    postId, 
    disabled = false, 
    initialVoteStatus 
}: VoteButtonsProps) {
  const { firebaseUser } = useAuth()
  const { toast } = useToast()
  const [isVoting, setIsVoting] = useState(false)

  const [voteStatus, setVoteStatus] = useState(initialVoteStatus || null);
  const [displayScore, setDisplayScore] = useState(upvotes - downvotes);

  useEffect(() => {
    setVoteStatus(initialVoteStatus || null);
    setDisplayScore(upvotes - downvotes);
  }, [initialVoteStatus, upvotes, downvotes]);

  const onVote = async (newVoteType: "up" | "down") => {
    if (!firebaseUser || isVoting || disabled) return
    
    setIsVoting(true)
    const previousStatus = voteStatus
    const previousScore = displayScore

    let newOptimisticStatus: "up" | "down" | null;
    let scoreChange: number;

    if (previousStatus === newVoteType) { // Toggling vote off
        newOptimisticStatus = null;
        scoreChange = newVoteType === 'up' ? -1 : 1;
    } else { // New vote or changing vote
        newOptimisticStatus = newVoteType;
        if (previousStatus === null) { // Brand new vote
            scoreChange = newVoteType === 'up' ? 1 : -1;
        } else { // Changing from up to down or vice-versa
            scoreChange = newVoteType === 'up' ? 2 : -2;
        }
    }
    
    // Optimistic UI update
    setVoteStatus(newOptimisticStatus);
    setDisplayScore(prev => prev + scoreChange);

    try {
      const result = await handleVote(firebaseUser.uid, itemId, itemType, newVoteType, postId);

      if (result?.error) {
          // On error, revert the optimistic update
          setVoteStatus(previousStatus);
          setDisplayScore(previousScore);
          toast({
              variant: "destructive",
              title: "Vote Failed",
              description: result.error,
          });
      }
    } catch (error) {
      // Catch any unexpected errors from the action
      setVoteStatus(previousStatus);
      setDisplayScore(previousScore);
      toast({
          variant: "destructive",
          title: "An Unexpected Error Occurred",
          description: "Please try again later.",
      });
      console.error("Voting failed unexpectedly:", error);
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={isVoting || disabled}
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          voteStatus === "up"
            ? "text-green-400 bg-green-500/20 hover:bg-green-500/30"
            : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
        } disabled:opacity-50`}
        onClick={() => onVote("up")}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className="text-sm font-mono text-slate-300 min-w-[2rem] text-center">{displayScore}</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isVoting || disabled}
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          voteStatus === "down"
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
