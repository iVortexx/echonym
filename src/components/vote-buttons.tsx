
"use client"

import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VoteType } from "@/lib/types"

interface VoteButtonsProps {
  onVote: (voteType: "up" | "down") => void
  voteStatus: VoteType | null | undefined
  score: number
  isVoting: boolean
  disabled?: boolean
}

export function VoteButtons({ onVote, voteStatus, score, isVoting, disabled = false }: VoteButtonsProps) {
  const finalDisabled = isVoting || disabled;

  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={finalDisabled}
        className={`h-7 w-7 p-0 transition-all duration-200 ${
          voteStatus === "up"
            ? "text-green-400 bg-green-500/20 hover:bg-green-500/30"
            : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
        } disabled:opacity-50`}
        onClick={() => onVote("up")}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className="text-sm font-mono text-slate-300 min-w-[2rem] text-center">{score}</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={finalDisabled}
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
