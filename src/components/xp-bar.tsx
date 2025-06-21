
"use client"

import { Progress } from "@/components/ui/progress"
import { getBadgeForXP, getNextBadge } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

type XPBarProps = {
  xp: number
}

export function XPBar({ xp }: XPBarProps) {
  const currentBadge = getBadgeForXP(xp)
  const nextBadge = getNextBadge(xp)

  const progress = nextBadge
    ? Math.round(((xp - currentBadge.minXP) / (nextBadge.minXP - currentBadge.minXP)) * 100)
    : 100

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline text-sm">
        <span className="font-semibold text-slate-200 font-mono flex items-center gap-2">
          {xp.toLocaleString()} XP
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-slate-500 hover:text-slate-300 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="bg-background border-border">
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                    <li>Create a new post: <span className="font-mono text-accent">+10 XP</span></li>
                    <li>Add a comment: <span className="font-mono text-accent">+5 XP</span></li>
                    <li>Receive an upvote: <span className="font-mono text-accent">+1 XP</span></li>
                    <li>Receive a downvote: <span className="font-mono text-red-500">-1 XP</span></li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        {nextBadge && (
          <span className="text-slate-400 font-mono text-xs">
            Next: {nextBadge.name} at {nextBadge.minXP.toLocaleString()} XP
          </span>
        )}
      </div>
      <Progress value={progress} className="h-3 bg-slate-700/50" />
    </div>
  )
}
