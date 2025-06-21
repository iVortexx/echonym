"use client"

import { Progress } from "@/components/ui/progress"
import { getBadgeForXP, getNextBadge } from "@/lib/utils"

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
        <span className="font-semibold text-slate-200 font-mono">{xp.toLocaleString()} XP</span>
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
