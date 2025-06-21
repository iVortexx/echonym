"use client"

import { getBadgeForXP } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface UserBadgeProps {
  xp: number
  className?: string
}

export function UserBadge({ xp, className }: UserBadgeProps) {
  const badge = getBadgeForXP(xp)

  return (
    <div className={cn("flex items-center space-x-1 text-xs font-mono", className)}>

      <span className={cn("font-semibold", badge.color)}>{badge.name}</span>
    </div>
  )
}
